"""Pure analysis helpers: complete source coverage and validated finding aggregation."""
import json
from schemas.events import ChunkAnalysis

def source_chunks(source: str, max_chars: int = 6000):
    if max_chars < 100:
        raise ValueError("Chunk size is too small")
    buffer, count, lines = [], 0, set()
    for number, line in enumerate(source.splitlines(keepends=True), 1):
        # Very long lines are split, keeping their true original line number.
        for offset in range(0, len(line), max_chars - 32):
            piece = line[offset:offset + max_chars - 32]
            numbered = f"{number}: {piece}"
            if buffer and count + len(numbered) > max_chars:
                yield "".join(buffer), lines
                buffer, count, lines = [], 0, set()
            buffer.append(numbered)
            count += len(numbered)
            lines.add(number)
    if buffer:
        yield "".join(buffer), lines

def parse_findings(text: str, allowed_lines: set[int]):
    text = text.strip()
    if text.startswith("```json") and text.endswith("```"):
        text = text[7:-3].strip()
    result = ChunkAnalysis.model_validate(json.loads(text))
    if any(f.line_number not in allowed_lines for f in result.findings):
        raise ValueError("Model returned a line outside the analyzed chunk")
    return result.findings

def aggregate(findings):
    unique = {}
    order = {"Kritik": 4, "Yüksek": 3, "Orta": 2, "Düşük": 1}
    for finding in findings:
        key = (finding.line_number, finding.title.casefold())
        if key not in unique or order[finding.severity] > order[unique[key].severity]:
            unique[key] = finding
    findings = list(unique.values())
    severity = max((f.severity for f in findings), key=order.get, default="Temiz")
    return findings, severity
