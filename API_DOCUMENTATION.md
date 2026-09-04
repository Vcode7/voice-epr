# Voice-to-Data & EPR REST API Documentation

This document provides complete developer-facing documentation for integrating external applications with the **Voice-to-Data** system.

---

## 📌 Overview & Core Concepts

The Voice-to-Data platform exposes clean, standardized REST APIs allowing external applications to:
1. **Retrieve previously saved records** by ID as structured JSON.
2. **Query all records belonging to any template** (or flexible mode).
3. **Filter template records dynamically** by ID, date ranges, and arbitrary template fields via query parameters or POST request bodies.
4. **Send raw audio recordings + template** to directly transcribe and extract structured entity JSON using the existing Whisper AI + LLM pipeline.

---

## 🔐 Authentication & Security

> [!NOTE]
> **Authentication Status: Open Access (Disabled by default)**  
> In the current version, authentication is not required to call these API endpoints. External applications can immediately interact with the endpoints without passing an API key.
> 
> **Future Migration:**  
> The system includes a standardized authorization middleware abstraction (`validateApiRequest`). When authentication is enabled in production (via environment variable `API_AUTH_REQUIRED=true`), applications will pass an API key using either:
> - Header: `x-api-key: your_api_key_here`
> - Header: `Authorization: Bearer your_api_key_here`
> 
> This ensures future authentication can be enabled without breaking or redesigning the endpoint schemas.

---

## 📡 Endpoints Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/history/{record_id}` | Retrieve an individual history record or child entry by ID as JSON. |
| `GET` | `/api/data/{template-name}` | Retrieve all saved records belonging to a template. Supports query filters. |
| `POST` | `/api/data/{template-name}` | Query and dynamically filter template records using a JSON filter body. |
| `POST` | `/api/voice-to-data` | Upload an audio file + template identifier to transcribe and extract JSON. |

---

## 1. History Record API

### `GET /api/history/{record_id}`

Retrieves a single saved Voice-to-Data history record or specific child entry formatted directly as structured JSON.

#### Request Parameters
- **Path Parameter**: `record_id` (String, Required) - The unique ID of the parent record or individual child entry (e.g. `entry_1725270123_abc`).

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/history/entry_1725270123_abc"
```

#### Example JSON Response (Single Entry)

```json
{
  "id": "entry_1725270123_abc",
  "template": "Monitoring Details",
  "template_id": "default_monitoring_details",
  "is_flexible": false,
  "data": {
    "part_no": "ABC123",
    "shift": "Shift A",
    "production_qty": 500,
    "ok_qty": 490,
    "rejected_qty": 10
  },
  "created_at": "2026-09-02T10:30:00.000Z",
  "date": "02-09-2026"
}
```

#### Example JSON Response (Batch Multi-Entry Record)

```json
{
  "id": "entry_1725270123_batch",
  "template": "Monitoring Details",
  "template_id": "default_monitoring_details",
  "count": 2,
  "data": {
    "part_no": "ABC123",
    "shift": "Shift A"
  },
  "entries": [
    {
      "id": "entry_1",
      "entry_number": 1,
      "title": "Monitoring Details",
      "data": {
        "part_no": "ABC123",
        "shift": "Shift A",
        "production_qty": 500
      },
      "created_at": "2026-09-02T10:30:00.000Z"
    },
    {
      "id": "entry_2",
      "entry_number": 2,
      "title": "Monitoring Details",
      "data": {
        "part_no": "DEF456",
        "shift": "Shift B",
        "production_qty": 300
      },
      "created_at": "2026-09-02T11:00:00.000Z"
    }
  ],
  "created_at": "2026-09-02T10:30:00.000Z",
  "date": "02-09-2026"
}
```

#### Error Responses
- **`404 Not Found`**:
  ```json
  {
    "error": "Record not found with ID: \"invalid_id\""
  }
  ```

---

## 2. Template Data API (GET)

### `GET /api/data/{template-name}`

Retrieves all saved records and individual data entries belonging to a given template.

#### Template Slug Resolution
The `{template-name}` path parameter is resolved dynamically and supports:
- Template Name (e.g. `maintenance-report`, `Maintenance Report`, `maintenance_report`)
- Template ID (e.g. `default_monitoring_details`, `doctor_prescription`)
- Flexible Records: `/api/data/flexible`

#### Query Parameters (Optional Filters)
- `id`: Filter by specific record or entry ID.
- `date`: Filter by exact date (`DD-MM-YYYY` or `YYYY-MM-DD`).
- `date_from` / `from`: Filter records created on or after this date.
- `date_to` / `to`: Filter records created on or before this date.
- *Any template field key* (e.g. `?part_no=ABC123&shift=Shift%20A`): Filter by field values.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/data/maintenance-report?part_no=ABC123&date_from=2026-09-01"
```

#### Example JSON Response

```json
{
  "template": "Maintenance Report",
  "template_id": "template_maintenance_report",
  "count": 1,
  "filters_applied": {
    "part_no": "ABC123",
    "date_from": "2026-09-01"
  },
  "data": [
    {
      "id": "entry_1725270123_abc",
      "part_no": "ABC123",
      "issue": "Machine vibration",
      "action": "Bearing replaced",
      "technician": "John Doe",
      "date": "02-09-2026",
      "created_at": "2026-09-02T10:30:00.000Z"
    }
  ]
}
```

---

## 3. Template Data Dynamic Filtering API (POST)

### `POST /api/data/{template-name}`

Filter template records dynamically via JSON request body. Supports single-field, multi-field, and date range filtering.

#### Request Body Format
Accepts a JSON object with a `filters` map:

```json
{
  "filters": {
    "id": "optional_id",
    "date_from": "2026-09-01",
    "date_to": "2026-09-02",
    "<template_field_key>": "<filter_value>"
  }
}
```

#### Dynamic Filter Capabilities
- **ID Matching**: Matches against parent and child entry IDs.
- **Date Range Comparison**: Supports `DD-MM-YYYY`, `YYYY-MM-DD`, and ISO timestamps (`date_from`, `date_to`, `date_start`, `date_end`, `startDate`, `endDate`).
- **Dynamic Field Matching**: Works dynamically against any field defined in the template (e.g., `part_no`, `shift`, `technician`, `status`, `machine_id`). Performs case-insensitive matching and fuzzy field key normalization.
- **Multi-Field (AND Logic)**: Combines multiple filter fields together.

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/data/maintenance-report" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "part_no": "ABC123",
      "issue": "Machine vibration",
      "date_from": "2026-09-01",
      "date_to": "2026-09-02"
    }
  }'
```

#### Example JSON Response

```json
{
  "template": "Maintenance Report",
  "template_id": "template_maintenance_report",
  "count": 1,
  "filters_applied": {
    "part_no": "ABC123",
    "issue": "Machine vibration",
    "date_from": "2026-09-01",
    "date_to": "2026-09-02"
  },
  "data": [
    {
      "id": "entry_1725270123_abc",
      "part_no": "ABC123",
      "issue": "Machine vibration",
      "action": "Bearing replaced",
      "date": "02-09-2026",
      "created_at": "2026-09-02T10:30:00.000Z"
    }
  ]
}
```

---

## 4. Audio-to-JSON Voice Pipeline API

### `POST /api/voice-to-data`

Uploads an audio recording file along with a selected template identifier. The backend processes the audio through the existing Voice-to-Data pipeline (Whisper AI speech-to-text + LLM entity extraction + Auto-Fill + Date normalization) and returns the extracted template data directly as structured JSON.

#### Request Format
**Content-Type**: `multipart/form-data`

#### Multipart Form Parameters
- **`audio`** (or `file`) *(File / Blob, Required)*: The audio recording file (formats: `.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`).
- **`template`** *(String, Required)*: The template name, slug, or ID (e.g. `"maintenance-report"`, `"Monitoring Details"`, `"default_monitoring_details"`, or `"flexible"`).
- **`save`** *(Boolean, Optional)*: Pass `save=true` (or query param `?save=true`) to automatically persist the extracted record into the database history.
- **`x-custom-groq-key`** *(Header, Optional)*: Custom Groq API key for Bring-Your-Own-Key users.

#### Example Request (cURL)

```bash
curl -X POST "http://localhost:3000/api/voice-to-data" \
  -F "audio=@machine_dictation.mp3" \
  -F "template=maintenance-report"
```

#### Example JSON Response

```json
{
  "template": "Maintenance Report",
  "template_id": "template_maintenance_report",
  "data": {
    "part_no": "ABC123",
    "issue": "Machine vibration",
    "action": "Bearing replaced"
  },
  "table_rows": [],
  "raw_transcript": "Part number ABC 123 issue machine vibration action bearing replaced",
  "lookup_status": "none"
}
```

#### Example with Flexible Record Template

```bash
curl -X POST "http://localhost:3000/api/voice-to-data" \
  -F "audio=@dictation.webm" \
  -F "template=flexible"
```

Response:
```json
{
  "template": "flexible",
  "template_id": "flexible",
  "data": {
    "part_no": "X99",
    "status": "Operational"
  },
  "fields": [
    { "name": "part_no", "value": "X99" },
    { "name": "status", "value": "Operational" }
  ],
  "raw_transcript": "Part number X99 status operational"
}
```

---

## 🛠️ Step-by-Step External Integration Guide

### 1. Retrieve a Previously Saved Voice-to-Data Record
1. In the Voice-to-Data web interface, locate the record in the **Saved EPR Database Records** list.
2. Click the **Copy API Endpoint** button to copy the endpoint URL (e.g. `http://localhost:3000/api/history/entry_123`).
3. Make an HTTP `GET` request from your application (Python, JavaScript, Go, etc.):

```python
import requests

url = "http://localhost:3000/api/history/entry_1725270123_abc"
response = requests.get(url)
record = response.json()
print("Extracted Data:", record["data"])
```

### 2. Retrieve All Records for a Template
1. Fetch all records using `GET /api/data/{template-name}`:

```javascript
const res = await fetch("http://localhost:3000/api/data/maintenance-report");
const result = await res.json();
console.log(`Found ${result.count} records:`, result.data);
```

### 3. Filter Template Records Dynamically
1. Send a `POST` request with filter criteria in JSON:

```python
import requests

url = "http://localhost:3000/api/data/maintenance-report"
payload = {
    "filters": {
        "part_no": "ABC123",
        "date_from": "2026-09-01",
        "date_to": "2026-09-02"
    }
}
response = requests.post(url, json=payload)
data = response.json()
print(f"Matched {data['count']} filtered items:", data["data"])
```

### 4. Send Audio + Template and Receive Extracted JSON
1. Record audio from mobile app, desktop tool, or hardware mic.
2. Send via `multipart/form-data`:

```python
import requests

url = "http://localhost:3000/api/voice-to-data"
with open("dictation.mp3", "rb") as f:
    files = {"audio": ("dictation.mp3", f, "audio/mpeg")}
    data = {"template": "maintenance-report"}
    response = requests.post(url, files=files, data=data)

result = response.json()
print("Structured Data JSON:", result["data"])
```

---

## ⚠️ Error Codes Reference

| HTTP Code | Description | Typical Cause |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Record retrieved or filtered successfully. |
| `400 Bad Request` | Invalid parameters | Missing audio file, missing template identifier, or invalid JSON. |
| `404 Not Found` | Resource not found | Record ID does not exist or template identifier is unrecognized. |
| `422 Unprocessable` | Empty transcription | Audio recording was silent or could not be transcribed. |
| `500 Server Error` | Pipeline processing error | Groq API failure or internal server error. |
