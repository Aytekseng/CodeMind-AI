import json
import unittest
from unittest.mock import patch, Mock
from schemas.events import Finding, FileUploadedEvent
from services.analysis import source_chunks, parse_findings, aggregate

class AnalysisTests(unittest.TestCase):
    def finding(self, severity="Kritik", line=1):
        return Finding(title="SQL injection", severity=severity, line_number=line,
            description="Parametreler birleştiriliyor", recommendation="Parametreli sorgu kullanın")

    def test_complete_source_coverage(self):
        source = "".join(f"line_{n}\n" for n in range(2000))
        chunks = list(source_chunks(source, 300))
        covered = set().union(*(lines for _, lines in chunks))
        self.assertEqual(covered, set(range(1, 2001)))
        self.assertIn("line_1999", "".join(text for text, _ in chunks))

    def test_long_line_not_truncated(self):
        source = "x" * 20000 + "\nlast\n"
        chunks = list(source_chunks(source, 300))
        self.assertEqual(sum(text.count("x") for text, _ in chunks), 20000)
        self.assertIn(2, set().union(*(lines for _, lines in chunks)))

    def test_no_findings_is_clean(self):
        self.assertEqual(aggregate(parse_findings('{"findings":[]}', {1})), ([], "Temiz"))

    def test_plain_text_negation_is_not_a_critical_finding(self):
        with self.assertRaises(ValueError):
            parse_findings("SQL injection bulunamadı.", {1})

    def test_out_of_range_lines_rejected(self):
        payload = json.dumps({"findings": [self.finding(line=99).model_dump()]})
        with self.assertRaises(ValueError): parse_findings(payload, {1, 2})

    def test_invalid_severity_rejected(self):
        payload = self.finding().model_dump(); payload["severity"] = "Maybe"
        with self.assertRaises(ValueError): parse_findings(json.dumps({"findings": [payload]}), {1})

    def test_duplicate_findings_merged_and_severity_ranked(self):
        findings, severity = aggregate([self.finding(), self.finding(), self.finding("Düşük", 2)])
        self.assertEqual(len(findings), 2); self.assertEqual(severity, "Kritik")

    def test_duplicate_finding_cannot_lower_earlier_severity(self):
        for values in ([self.finding("Kritik"), self.finding("Düşük")], [self.finding("Düşük"), self.finding("Kritik")]):
            findings, severity = aggregate(values)
            self.assertEqual(len(findings), 1)
            self.assertEqual((findings[0].severity, severity), ("Kritik", "Kritik"))

    def test_invalid_job_id_rejected(self):
        with self.assertRaises(ValueError): FileUploadedEvent(FileId="../some-object")

class WorkerLifecycleTests(unittest.TestCase):
    def setUp(self):
        from services import ai_service
        self.worker = ai_service
        self.event = FileUploadedEvent(FileId="11111111-1111-1111-1111-111111111111")
        self.job = {"status": "Pending", "requiresApiKey": True, "apiKey": "test-only-key",
                    "model": "test", "objectKey": "authoritative-object"}

    def test_cancelled_job_does_not_call_model_or_storage(self):
        with patch.object(self.worker, "job_context", return_value=None), patch.object(self.worker, "get_file_from_minio") as storage:
            self.worker.process_uploaded_file(self.event); storage.assert_not_called()

    def test_missing_byok_fails_without_system_key_fallback(self):
        with patch.object(self.worker, "job_context", return_value={**self.job, "apiKey": None}), patch.object(self.worker, "get_llm_instance") as llm, patch.object(self.worker, "send_analysis_failure") as failure:
            self.worker.process_uploaded_file(self.event); llm.assert_not_called(); failure.assert_called_once()

    def test_cancellation_between_chunks_stops_remaining_work(self):
        model = Mock(); model.invoke.return_value.content = '{"findings":[]}'
        with patch.object(self.worker, "job_context", side_effect=[self.job, self.job, None]), patch.object(self.worker, "get_file_from_minio", return_value="a\n" * 10000), patch.object(self.worker, "get_llm_instance", return_value=(model, "test")), patch.object(self.worker, "send_analysis_result") as publish:
            self.worker.process_uploaded_file(self.event)
            self.assertEqual(model.invoke.call_count, 1); publish.assert_not_called()

    def test_broker_failure_propagates_instead_of_acknowledging_job(self):
        model = Mock(); model.invoke.return_value.content = '{"findings":[]}'
        with patch.object(self.worker, "job_context", return_value=self.job), patch.object(self.worker, "get_file_from_minio", return_value="a\n"), patch.object(self.worker, "get_llm_instance", return_value=(model, "test")), patch.object(self.worker, "send_analysis_result", side_effect=RuntimeError("broker down")):
            with self.assertRaises(RuntimeError): self.worker.process_uploaded_file(self.event)

class ProviderRequestTests(unittest.TestCase):
    def test_ollama_wire_request_enforces_finding_schema_for_local_models(self):
        import httpx
        from schemas.events import ChunkAnalysis
        from services.ai_service import get_llm_instance
        for selection in ("llama3", "qwen2.5-coder"):
            with self.subTest(model=selection):
                payloads = []
                def respond(request):
                    payloads.append(json.loads(request.content))
                    return httpx.Response(200, json={"model": selection, "done": True,
                        "message": {"role": "assistant", "content": '{"findings":[]}'}})
                model, _ = get_llm_instance(selection)
                with httpx.Client(base_url="http://ollama.test", transport=httpx.MockTransport(respond)) as client:
                    with patch.object(model._client, "_client", client):
                        response = model.invoke("Return JSON findings")
                self.assertEqual(payloads[0]["format"], ChunkAnalysis.model_json_schema(by_alias=False))
                self.assertEqual(parse_findings(response.content, {1}), [])

    def test_openai_wire_request_uses_supported_reasoning_parameters(self):
        import httpx
        import langchain_openai
        from services.ai_service import get_llm_instance
        original = langchain_openai.ChatOpenAI
        payloads = []
        def respond(request):
            payloads.append(json.loads(request.content))
            return httpx.Response(200, json={"id": "test", "object": "chat.completion", "created": 0, "model": "gpt-6.1-sol", "choices": [{"index": 0, "message": {"role": "assistant", "content": '{"findings":[]}'}, "finish_reason": "stop"}]})
        with httpx.Client(transport=httpx.MockTransport(respond)) as client:
            with patch.object(langchain_openai, "ChatOpenAI", side_effect=lambda **kw: original(http_client=client, **kw)):
                model, _ = get_llm_instance("gpt-6-sol", "test-only-key")
                model.invoke("Return JSON findings")
        self.assertEqual(payloads[0]["model"], "gpt-6.1-sol")
        self.assertEqual(payloads[0]["reasoning_effort"], "medium")
        self.assertNotIn("temperature", payloads[0])

    def test_anthropic_wire_request_uses_canonical_model_id(self):
        import httpx2 as httpx
        import langchain_anthropic
        from services.ai_service import get_llm_instance
        payloads = []
        def respond(request):
            payloads.append(json.loads(request.content))
            return httpx.Response(200, json={"id": "test", "type": "message", "role": "assistant", "model": "claude-sonnet-5-5", "content": [{"type": "text", "text": '{"findings":[]}'}], "stop_reason": "end_turn", "usage": {"input_tokens": 1, "output_tokens": 1}})
        with httpx.Client(transport=httpx.MockTransport(respond)) as client:
            with patch("langchain_anthropic.chat_models._get_default_httpx_client", return_value=client):
                model, _ = get_llm_instance("claude-sonnet-5-5", "test-only-key")
                model.invoke("Return JSON findings")
        self.assertEqual(payloads[0]["model"], "claude-sonnet-5-5")
        self.assertNotIn("temperature", payloads[0])

class ConsumerRecoveryTests(unittest.TestCase):
    def test_dead_letter_delivery_failure_retries_same_message_before_commit(self):
        from kafka_utils import consumer as module
        message = Mock()
        message.error.return_value = None
        message.value.return_value = b'{invalid-json'
        broker = Mock()
        broker.poll.side_effect = [message, KeyboardInterrupt()]
        with patch.object(module, "Consumer", return_value=broker), patch.object(module.settings, "WORKER_SECRET", "x" * 32), patch.object(module, "publish", side_effect=[RuntimeError("broker unavailable"), None]) as publish, patch.object(module.time, "sleep"):
            with self.assertRaises(KeyboardInterrupt):
                module.start_consuming()
            self.assertEqual(publish.call_count, 2)
            broker.commit.assert_called_once_with(message=message, asynchronous=False)
            broker.close.assert_called_once()

if __name__ == "__main__": unittest.main()
