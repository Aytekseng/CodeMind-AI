import api, { ApiResponse } from "./apiClient"

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  role: "Admin" | "Developer" | "Auditor" | string
}

export interface CreateTeamMemberPayload {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  role: string
  temporaryPassword: string
}

export interface DeleteCompanyPayload {
  password: string
  confirmationCompanyName: string
}

export const teamService = {
  getMembers: async (): Promise<ApiResponse<TeamMember[]>> => {
    return await api.get<ApiResponse<TeamMember[]>>("/api/team/members")
  },

  createMember: async (payload: CreateTeamMemberPayload): Promise<ApiResponse<TeamMember>> => {
    return await api.post<ApiResponse<TeamMember>>("/api/team/members", payload)
  },

  updateMemberRole: async (id: string, role: string): Promise<ApiResponse<TeamMember>> => {
    return await api.put<ApiResponse<TeamMember>>(`/api/team/members/${id}/role`, { role })
  },

  removeMember: async (id: string): Promise<ApiResponse<string>> => {
    return await api.delete<ApiResponse<string>>(`/api/team/members/${id}`)
  },

  deleteCompanyWorkspace: async (payload: DeleteCompanyPayload): Promise<ApiResponse<string>> => {
    return await api.post<ApiResponse<string>>("/api/team/delete-company", payload)
  },

  exportCompanyData: async (): Promise<string> => {
    return await api.downloadFile(
      "/api/team/export-data",
      `codemind-company-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    )
  },

  exportCompanyPdf: async (): Promise<string> => {
    return await api.downloadFile(
      "/api/team/export-pdf",
      `codemind-company-audit-report-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`
    )
  }
}
