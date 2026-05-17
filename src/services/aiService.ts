import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const isPdf = (mimeType: string) => mimeType === 'application/pdf'

export interface HealthInsightInput {
  profile: {
    displayName: string
    dateOfBirth?: string | null
    gender?: string | null
    bloodGroup?: string | null
    allergies?: string | null
    chronicConditions?: string | null
  }
  vitals: Array<{
    vitalType: string
    valueNumber?: number | null
    systolic?: number | null
    diastolic?: number | null
    unit?: string | null
    recordedAt: string
    notes?: string | null
  }>
  medications: Array<{
    name: string
    dosage?: string | null
    inventoryQuantity?: number | null
    lowStockThreshold?: number | null
    adherencePercent: number
    totalLogs: number
    takenLogs: number
  }>
  illnesses: Array<{
    diagnosis: string
    severity: string
    status: string
    symptoms: string[]
    recordedAt: string
  }>
  days: number
}

export interface VitalTrend {
  type: string
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'INSUFFICIENT_DATA'
  note: string
}

export interface MedicationAdherence {
  name: string
  adherencePercent: number
  lowStock: boolean
  note: string
}

export interface HealthAlert {
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
}

export interface HealthInsightResult {
  summary: string
  vitalTrends: VitalTrend[]
  medicationAdherence: MedicationAdherence[]
  alerts: HealthAlert[]
  recommendations: string[]
}

const SYSTEM_PROMPT = `You are a personal health data analyst. Analyze the provided health records and return a structured JSON response only — no markdown, no prose outside JSON.

Return exactly this JSON shape:
{
  "summary": "2-3 sentence overall health status",
  "vitalTrends": [
    { "type": "VITAL_TYPE", "trend": "IMPROVING|WORSENING|STABLE|INSUFFICIENT_DATA", "note": "one-line observation" }
  ],
  "medicationAdherence": [
    { "name": "medication name", "adherencePercent": 0-100, "lowStock": true|false, "note": "one-line note" }
  ],
  "alerts": [
    { "severity": "HIGH|MEDIUM|LOW", "message": "alert message" }
  ],
  "recommendations": ["actionable item 1", "actionable item 2", "...up to 5"]
}

Rules:
- If there is insufficient data for a vital, set trend to INSUFFICIENT_DATA
- Flag any medication where inventoryQuantity is at or below lowStockThreshold as lowStock: true
- Keep all text concise and plain (no markdown inside JSON strings)
- This is for personal tracking only — not a medical diagnosis
- Omit vitalTrends or medicationAdherence arrays if there is no relevant data`

function buildUserMessage(data: HealthInsightInput): string {
  return `Analyze the following health data for the past ${data.days} days and return your JSON response.

PROFILE:
${JSON.stringify(data.profile, null, 2)}

VITALS (${data.vitals.length} entries):
${JSON.stringify(data.vitals, null, 2)}

MEDICATIONS:
${JSON.stringify(data.medications, null, 2)}

ILLNESSES (last 90 days):
${JSON.stringify(data.illnesses, null, 2)}`
}

export interface ExtractedMedication {
  name: string
  dosage: string | null
  instructions: string | null
}

export interface PrescriptionExtract {
  providerName: string | null
  recordDate: string | null
  notes: string | null
  medications: ExtractedMedication[]
}

const PRESCRIPTION_PROMPT = `You are a medical prescription parser. Extract information from the prescription image and return ONLY a JSON object — no markdown, no explanation.

Return exactly this shape:
{
  "providerName": "doctor or hospital name, or null",
  "recordDate": "YYYY-MM-DD format, or null if not found",
  "notes": "general instructions or notes on the prescription, or null",
  "medications": [
    { "name": "medication name", "dosage": "e.g. 500mg", "instructions": "e.g. twice daily after meals" }
  ]
}

Rules:
- medications array may be empty if none found
- All string values should be plain text, no markdown
- recordDate must be YYYY-MM-DD or null`

function parseResult(text: string): HealthInsightResult {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
}

export async function generateHealthInsights(
  provider: string,
  apiKey: string,
  data: HealthInsightInput
): Promise<HealthInsightResult> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ] as any,
      messages: [{ role: 'user', content: buildUserMessage(data) }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return parseResult(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(data) }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return parseResult(text)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

export async function extractPrescription(
  provider: string,
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<PrescriptionExtract> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const fileBlock: any = isPdf(mimeType)
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } }
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [fileBlock, { type: 'text', text: PRESCRIPTION_PROMPT }]
      }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return JSON.parse(block.text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim())
  }

  if (provider === 'openai') {
    if (isPdf(mimeType)) throw new Error('PDF extraction is not supported with OpenAI — please upload an image instead.')
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: PRESCRIPTION_PROMPT }
        ]
      }]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim())
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

export interface ExtractedLabResult {
  testName: string
  value: string
  unit: string | null
  referenceRange: string | null
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'UNKNOWN'
}

export interface LabReportExtract {
  labName: string | null
  collectedAt: string | null
  notes: string | null
  results: ExtractedLabResult[]
}

const LAB_REPORT_PROMPT = `You are a medical lab report parser. Extract all test results from the lab report image and return ONLY a JSON object — no markdown, no explanation.

Return exactly this shape:
{
  "labName": "name of the laboratory or hospital, or null",
  "collectedAt": "YYYY-MM-DD format date of collection, or null if not found",
  "notes": "any general notes or remarks on the report, or null",
  "results": [
    {
      "testName": "name of the test (e.g. Hemoglobin, Fasting Blood Sugar)",
      "value": "the result value as a string (e.g. 13.5, Reactive, >200)",
      "unit": "measurement unit (e.g. g/dL, mg/dL, %) or null",
      "referenceRange": "normal range as shown on report (e.g. 12.0-16.0, <200) or null",
      "status": "NORMAL | HIGH | LOW | CRITICAL | UNKNOWN — based on value vs reference range"
    }
  ]
}

Rules:
- results array may be empty if no test results are found
- Determine status by comparing value to referenceRange; use UNKNOWN if range is absent
- All string values should be plain text, no markdown
- collectedAt must be YYYY-MM-DD or null`

export async function extractLabReport(
  provider: string,
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<LabReportExtract> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const fileBlock: any = isPdf(mimeType)
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } }
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [fileBlock, { type: 'text', text: LAB_REPORT_PROMPT }]
      }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return JSON.parse(block.text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim())
  }

  if (provider === 'openai') {
    if (isPdf(mimeType)) throw new Error('PDF extraction is not supported with OpenAI — please upload an image instead.')
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: LAB_REPORT_PROMPT }
        ]
      }]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim())
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}
