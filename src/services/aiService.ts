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

function parseResult<T = HealthInsightResult>(text: string): T {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as T
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

// ─── Lab Result Explanation ───────────────────────────────────────────────────

export interface LabExplanationResult {
  testName: string
  summary: string
  measures: string
  highMeaning: string
  highCauses: string[]
  lowMeaning: string
  lowCauses: string[]
  prevention: string[]
  whenToWorry: string
}

const LAB_EXPLAIN_PROMPT = `You are a medical educator explaining a lab test to a layperson in plain, reassuring language. Given a lab test name, return ONLY a JSON object — no markdown, no explanation.

Return exactly this shape:
{
  "testName": "the proper/full name of the test",
  "summary": "1-2 sentence plain-language overview of what this test is",
  "measures": "what the test actually measures in the body and why doctors order it",
  "highMeaning": "what an elevated result generally indicates",
  "highCauses": ["common cause", "another cause"],
  "lowMeaning": "what a low result generally indicates",
  "lowCauses": ["common cause", "another cause"],
  "prevention": ["practical lifestyle tip", "another tip"],
  "whenToWorry": "short guidance on when to consult a doctor"
}

Rules:
- Use simple, non-alarming language a patient can understand
- 2-4 items in each array
- If a test is not typically described as high/low (e.g. qualitative tests), still give the most useful interpretation in those fields
- Do NOT diagnose or give personalized medical advice; speak in general terms
- All strings plain text, no markdown`

export async function explainLabResult(
  provider: string,
  apiKey: string,
  testName: string
): Promise<LabExplanationResult> {
  const userMessage = `Lab test name: ${testName}`

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: LAB_EXPLAIN_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ] as any,
      messages: [{ role: 'user', content: userMessage }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return parseResult<LabExplanationResult>(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LAB_EXPLAIN_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return parseResult<LabExplanationResult>(text)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

// ─── Spending Insights ────────────────────────────────────────────────────────

export interface SpendingInsightInput {
  currency: string
  days: number
  currentPeriod: {
    total: number
    byCategory: Array<{ name: string; amount: number; count: number }>
  }
  previousPeriod: {
    total: number
    byCategory: Array<{ name: string; amount: number }>
  }
  budgets: Array<{ name: string; amount: number; spent: number; currency: string; alertThreshold: number | null }>
  subscriptions: Array<{ title: string; amount: number; currency: string; billingCycle: string }>
  goals: Array<{ title: string; targetAmount: number; currentAmount: number; currency: string; targetDate: string | null; percentComplete: number }>
}

export interface SpendingInsightResult {
  summary: string
  topCategories: Array<{ name: string; amount: number; percentOfTotal: number; trend: 'UP' | 'DOWN' | 'STABLE' | 'NEW'; note: string }>
  budgetAlerts: Array<{ budgetName: string; severity: 'OVER' | 'WARNING' | 'OK'; percentUsed: number; message: string }>
  subscriptionSummary: { monthlyTotal: number; count: number; note: string } | null
  goalProgress: Array<{ title: string; percentComplete: number; note: string }>
  alerts: Array<{ severity: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }>
  recommendations: string[]
}

const SPENDING_SYSTEM_PROMPT = `You are a personal finance analyst. Analyze the provided spending data and return a structured JSON response only — no markdown, no prose outside JSON.

Return exactly this JSON shape:
{
  "summary": "2-3 sentence overall financial status for the period",
  "topCategories": [
    { "name": "category name", "amount": 0.00, "percentOfTotal": 0, "trend": "UP|DOWN|STABLE|NEW", "note": "one-line observation" }
  ],
  "budgetAlerts": [
    { "budgetName": "name", "severity": "OVER|WARNING|OK", "percentUsed": 0, "message": "one-line status" }
  ],
  "subscriptionSummary": { "monthlyTotal": 0.00, "count": 0, "note": "one-line observation" },
  "goalProgress": [
    { "title": "goal title", "percentComplete": 0, "note": "one-line observation" }
  ],
  "alerts": [
    { "severity": "HIGH|MEDIUM|LOW", "message": "alert message" }
  ],
  "recommendations": ["actionable item 1", "...up to 5"]
}

Rules:
- trend: UP if current > previous by >5%, DOWN if less, NEW if no prior data, STABLE otherwise
- budgetAlerts severity: OVER if percentUsed > 100, WARNING if > alertThreshold (default 80%), OK otherwise
- Include all budgets in budgetAlerts regardless of severity
- subscriptionSummary may be null if no subscriptions
- Keep all text concise and plain — no markdown inside JSON strings
- This is personal tracking only, not financial advice`

function buildSpendingMessage(data: SpendingInsightInput): string {
  return `Analyze the following spending data for the past ${data.days} days (currency: ${data.currency}) and return your JSON response.

CURRENT PERIOD (last ${data.days} days):
Total: ${data.currentPeriod.total}
By category: ${JSON.stringify(data.currentPeriod.byCategory, null, 2)}

PREVIOUS PERIOD (prior ${data.days} days):
Total: ${data.previousPeriod.total}
By category: ${JSON.stringify(data.previousPeriod.byCategory, null, 2)}

BUDGETS: ${JSON.stringify(data.budgets, null, 2)}

ACTIVE SUBSCRIPTIONS: ${JSON.stringify(data.subscriptions, null, 2)}

FINANCIAL GOALS: ${JSON.stringify(data.goals, null, 2)}`
}

export async function generateSpendingInsights(
  provider: string,
  apiKey: string,
  data: SpendingInsightInput
): Promise<SpendingInsightResult> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: SPENDING_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] as any,
      messages: [{ role: 'user', content: buildSpendingMessage(data) }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return parseResult<SpendingInsightResult>(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SPENDING_SYSTEM_PROMPT },
        { role: 'user', content: buildSpendingMessage(data) }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return parseResult<SpendingInsightResult>(text)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

// ─── Quick-Add Expense Parser ─────────────────────────────────────────────────

export interface QuickExpenseParse {
  title: string
  amount: number
  categoryId: string | null
  budgetId: string | null
  notes: string | null
}

const QUICK_ADD_PROMPT = `You are an expense parser. The user typed a short natural-language expense entry. Extract the fields and return ONLY a JSON object — no markdown, no explanation.

Return exactly this shape:
{
  "title": "merchant or description (title-cased)",
  "amount": 0.00,
  "categoryId": "id from provided categories list, or null",
  "budgetId": "id from provided budgets list, or null",
  "notes": "any extra context the user included, or null"
}

Rules:
- amount must be a positive number (no currency symbol)
- Match categoryId to the most fitting category name based on the merchant/description
- Match budgetId to a budget whose categoryName matches the chosen category, or whose name clearly fits the expense
- If the user explicitly names a budget, prefer that
- If no budget clearly fits, return null for budgetId — do NOT guess or fall back to a default budget
- title should be clean and concise — capitalise properly (e.g. "Myjoy" not "myjoy")
- Return null for any field you cannot confidently fill`

export async function parseQuickExpense(
  provider: string,
  apiKey: string,
  text: string,
  categories: Array<{ id: string; name: string }>,
  budgets: Array<{ id: string; name: string; categoryId: string | null; categoryName?: string | null }>
): Promise<QuickExpenseParse> {
  const userMessage = `Parse this expense entry: "${text}"

Available categories: ${categories.length ? JSON.stringify(categories) : 'none'}
Available active budgets: ${budgets.length ? JSON.stringify(budgets) : 'none'}

Return the JSON object.`

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: QUICK_ADD_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No response')
    return parseResult<QuickExpenseParse>(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: QUICK_ADD_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
    const t = response.choices[0]?.message?.content
    if (!t) throw new Error('No response')
    return parseResult<QuickExpenseParse>(t)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

// ─── Logbook Insights ─────────────────────────────────────────────────────────

export interface LogbookPropertyMonth {
  year: number
  month: number
  rent: number
  expense: number
  entries: number
}

export interface LogbookInsightInput {
  properties: Array<{
    name: string
    monthly: LogbookPropertyMonth[]
    totalRent: number
    totalExpense: number
  }>
  dateRange: { from: string; to: string }
}

export interface LogbookInsightResult {
  summary: string
  propertyInsights: Array<{
    property: string
    observation: string
    trend: 'UP' | 'DOWN' | 'STABLE'
    monthlyAvgRent: number
    monthlyAvgExpense: number
  }>
  alerts: Array<{ severity: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }>
  recommendations: string[]
}

const LOGBOOK_INSIGHTS_PROMPT = `You are a rental property financial analyst. Analyze the provided payment records and return a structured JSON response only — no markdown, no prose outside JSON.

Return exactly this JSON shape:
{
  "summary": "2-3 sentence overall financial status across all properties",
  "propertyInsights": [
    { "property": "property name", "observation": "one-line key observation", "trend": "UP|DOWN|STABLE", "monthlyAvgRent": 0.00, "monthlyAvgExpense": 0.00 }
  ],
  "alerts": [
    { "severity": "HIGH|MEDIUM|LOW", "message": "alert message" }
  ],
  "recommendations": ["actionable item 1", "...up to 5"]
}

Rules:
- trend is based on recent months vs earlier months; STABLE if data is insufficient
- Keep all text concise and plain — no markdown inside JSON strings
- This is personal property tracking only`

export async function generateLogbookInsights(
  provider: string,
  apiKey: string,
  data: LogbookInsightInput
): Promise<LogbookInsightResult> {
  const userMessage = `Analyze rental property payment data from ${data.dateRange.from} to ${data.dateRange.to} and return your JSON response.

PROPERTIES:
${JSON.stringify(data.properties, null, 2)}`

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: LOGBOOK_INSIGHTS_PROMPT, cache_control: { type: 'ephemeral' } }] as any,
      messages: [{ role: 'user', content: userMessage }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return parseResult<LogbookInsightResult>(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LOGBOOK_INSIGHTS_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return parseResult<LogbookInsightResult>(text)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}

// ─── Logbook Audit ────────────────────────────────────────────────────────────

export interface LogbookAuditEntry {
  date: string
  mainCategory: string
  subCategory: string
  amount: number
  description: string | null
}

export interface LogbookMonthlySummary {
  year: number
  month: number
  income: number
  expenses: number
  netFlow: number
  entryCount: number
  categories: Record<string, number>
}

export interface LogbookAuditInput {
  group: string
  entries: LogbookAuditEntry[]
  monthlySummary: LogbookMonthlySummary[]
  totalIncome: number
  totalExpenses: number
  netBalance: number
  dateRange: { from: string; to: string }
  dataQuality: {
    missingDescription: number
    missingSubCategory: number
    totalEntries: number
  }
}

export interface LogbookAuditIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  type: 'DUPLICATE' | 'MISSING_RENT' | 'UNUSUAL_AMOUNT' | 'DATA_GAP' |
        'CASH_FLOW_NEGATIVE' | 'CATEGORY_SPIKE' | 'DORMANT_PROPERTY' |
        'DATA_QUALITY' | 'EXPENSE_RATIO' | 'ROUND_NUMBER' | 'OTHER'
  message: string
  date?: string
  affectedCategory?: string
}

export interface LogbookAuditResult {
  summary: string
  issues: LogbookAuditIssue[]
  totalEntries: number
  issuesFound: number
  healthScore: number
  cashFlowSummary: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    trend: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    consecutiveNegativeMonths: number
  }
  topCategories: { category: string; amount: number; percentage: number }[]
  dataQualityScore: number
  recommendations: string[]
}

const LOGBOOK_AUDIT_PROMPT = `You are a financial auditor for rental property payment records. Analyze the provided data and return a comprehensive audit report as structured JSON only — no markdown, no prose outside JSON.

Return exactly this JSON shape:
{
  "summary": "2-3 sentence overview of findings and overall health",
  "issues": [
    {
      "severity": "HIGH|MEDIUM|LOW",
      "type": "DUPLICATE|MISSING_RENT|UNUSUAL_AMOUNT|DATA_GAP|CASH_FLOW_NEGATIVE|CATEGORY_SPIKE|DORMANT_PROPERTY|DATA_QUALITY|EXPENSE_RATIO|ROUND_NUMBER|OTHER",
      "message": "specific, actionable description of the issue",
      "date": "YYYY-MM or YYYY-MM-DD (optional)",
      "affectedCategory": "category name if applicable (optional)"
    }
  ],
  "totalEntries": 0,
  "issuesFound": 0,
  "healthScore": 0,
  "cashFlowSummary": {
    "totalIncome": 0,
    "totalExpenses": 0,
    "netBalance": 0,
    "trend": "POSITIVE|NEGATIVE|NEUTRAL",
    "consecutiveNegativeMonths": 0
  },
  "topCategories": [
    { "category": "name", "amount": 0, "percentage": 0 }
  ],
  "dataQualityScore": 0,
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Issue type rules:
- DUPLICATE: two entries with same date and same or nearly identical amount
- MISSING_RENT: a month that historically has rental payments but has none recorded
- UNUSUAL_AMOUNT: an amount that is a significant statistical outlier (>2x or <0.5x typical range for that category)
- DATA_GAP: 45+ days with zero entries when the period was otherwise active
- CASH_FLOW_NEGATIVE: two or more consecutive months where expenses exceed income
- CATEGORY_SPIKE: a category's total in a month is 3x+ its typical monthly amount
- DORMANT_PROPERTY: a property/category that had regular entries but nothing for 60+ days
- DATA_QUALITY: 20%+ of entries are missing descriptions or subcategories
- EXPENSE_RATIO: repair/expense costs exceed 40% of rental income in a period
- ROUND_NUMBER: multiple entries with perfectly round amounts (e.g. 5000, 10000) — may indicate estimates
- OTHER: anything that doesn't fit above but warrants attention

Scoring rules:
- healthScore 0-100: start at 100, deduct 15 per HIGH issue, 8 per MEDIUM, 3 per LOW, min 0
- dataQualityScore 0-100: based on completeness of descriptions and subcategories
- trend: POSITIVE if last 3 months net flow is improving, NEGATIVE if declining, NEUTRAL otherwise
- topCategories: top 5 by total amount, percentages should sum to 100 across all categories shown
- recommendations: 2-4 specific, actionable items the user should act on
- Keep all text concise and plain — no markdown inside JSON strings`

export async function analyzeLogbookHistory(
  provider: string,
  apiKey: string,
  data: LogbookAuditInput
): Promise<LogbookAuditResult> {
  const sampleEntries = data.entries.length > 300
    ? [...data.entries.slice(0, 150), ...data.entries.slice(-150)]
    : data.entries

  const userMessage = `Audit payment records for group "${data.group}".

DATE RANGE: ${data.dateRange.from} to ${data.dateRange.to}
TOTAL ENTRIES: ${data.entries.length} (${sampleEntries.length} shown if truncated)
TOTAL INCOME: ${data.totalIncome.toFixed(2)}
TOTAL EXPENSES: ${data.totalExpenses.toFixed(2)}
NET BALANCE: ${data.netBalance.toFixed(2)}
DATA QUALITY: ${data.dataQuality.missingDescription} entries missing description, ${data.dataQuality.missingSubCategory} missing subcategory (of ${data.dataQuality.totalEntries} total)

MONTHLY SUMMARY (income / expenses / net / count):
${data.monthlySummary.map(m => `${m.year}-${String(m.month).padStart(2,'0')}: income=${m.income.toFixed(2)} expenses=${m.expenses.toFixed(2)} net=${m.netFlow.toFixed(2)} entries=${m.entryCount}`).join('\n')}

CATEGORY TOTALS PER MONTH:
${data.monthlySummary.map(m => `${m.year}-${String(m.month).padStart(2,'0')}: ${Object.entries(m.categories).map(([k,v]) => `${k}=${(v as number).toFixed(2)}`).join(', ')}`).join('\n')}

RAW ENTRIES (date | mainCategory | subCategory | amount | description):
${sampleEntries.map(e => `${e.date} | ${e.mainCategory} | ${e.subCategory} | ${e.amount} | ${e.description || ''}`).join('\n')}

Return your JSON audit response.`

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [{ type: 'text', text: LOGBOOK_AUDIT_PROMPT, cache_control: { type: 'ephemeral' } }] as any,
      messages: [{ role: 'user', content: userMessage }]
    })
    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from Anthropic')
    return parseResult<LogbookAuditResult>(block.text)
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LOGBOOK_AUDIT_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No response from OpenAI')
    return parseResult<LogbookAuditResult>(text)
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}
