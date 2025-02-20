# Job Execution Flow

This document outlines the basic sequence of operations for creating and running a job in the system.

## 1. Job Creation

1. A job is created by calling `createJob()` with a `CreateJobRequest` containing:
   - `workflow_id`: ID of the workflow to execute
   - `name`: Name of the job
   - `description` (optional): Description of the job
   - `input_variables`: Array of job variables matching workflow inputs

Example CreateJobRequest:
```json
{
  "workflow_id": "wf_analyze_document",
  "name": "Analyze Q4 Report",
  "description": "Analysis of Q4 2023 financial report",
  "input_variables": [
    {
      "name": "document",
      "variable_id": "input_doc",
      "required": true,
      "schema": {
        "type": "file",
        "mime_types": ["application/pdf"]
      }
    },
    {
      "name": "analysis_depth",
      "variable_id": "depth",
      "required": true,
      "schema": {
        "type": "string",
        "enum": ["basic", "detailed", "comprehensive"]
      }
    }
  ]
}
```

2. The system:
   - Validates the workflow exists
   - Creates a new unique `job_id`
   - Sets initial job status to `PENDING`
   - Maps workflow steps to job steps
   - Initializes step statuses to `PENDING`

Example created Job:
```json
{
  "job_id": "job_abc123",
  "workflow_id": "wf_analyze_document",
  "name": "Analyze Q4 Report",
  "description": "Analysis of Q4 2023 financial report",
  "status": "PENDING",
  "created_at": "2024-03-20T10:30:00Z",
  "updated_at": "2024-03-20T10:30:00Z",
  "input_variables": [
    {
      "name": "document",
      "variable_id": "input_doc",
      "required": true,
      "schema": {
        "type": "file",
        "mime_types": ["application/pdf"]
      }
    },
    {
      "name": "analysis_depth",
      "variable_id": "depth",
      "required": true,
      "schema": {
        "type": "string",
        "enum": ["basic", "detailed", "comprehensive"]
      }
    }
  ],
  "steps": [
    {
      "step_id": "step_1",
      "job_id": "job_abc123",
      "sequence_number": 0,
      "status": "PENDING",
      "tool": {
        "tool_id": "pdf_extractor",
        "name": "PDF Text Extractor"
      },
      "parameter_mappings": {
        "input_file": "input_doc",
        "extraction_mode": "full"
      },
      "output_mappings": {
        "extracted_text": "document_text"
      }
    },
    {
      "step_id": "step_2",
      "job_id": "job_abc123",
      "sequence_number": 1,
      "status": "PENDING",
      "tool": {
        "tool_id": "text_analyzer",
        "name": "Text Analysis Tool"
      },
      "parameter_mappings": {
        "text": "document_text",
        "analysis_level": "depth"
      },
      "output_mappings": {
        "analysis_results": "final_analysis"
      }
    }
  ]
}
```

## 2. Input Handling

1. Before starting the job, input variables must be set and validated:
   - Use `setInputValue()` for each required input
   - Call `validateInputs()` to ensure all required inputs are provided
   - `areInputsValid()` can be used to check input state

Example Input Values:
```json
{
  "input_values": {
    "input_doc": {
      "file_id": "file_xyz789",
      "name": "Q4_2023_Report.pdf"
    },
    "depth": "detailed"
  },
  "input_errors": {}
}
```

2. Input validation ensures:
   - All required fields have values
   - File inputs have valid file IDs
   - Boolean inputs are properly set

## 3. Job Execution

1. Start job execution with `startJob(jobId, inputVariables)`:
   - Updates job status to `RUNNING`
   - Sets `started_at` timestamp
   - Initializes execution state

Example Running Job State:
```json
{
  "job_id": "job_abc123",
  "status": "RUNNING",
  "started_at": "2024-03-20T10:31:00Z",
  "execution_progress": {
    "current_step": 0,
    "total_steps": 2,
    "is_paused": false
  }
}
```

2. Steps are executed sequentially:
   - Each step is executed via `executeStep(jobId, stepIndex)`
   - Tool execution results are captured
   - Output mappings are processed
   - Step status is updated to `COMPLETED` or `FAILED`

Example Step Execution Result:
```json
{
  "step_id": "step_1",
  "success": true,
  "outputs": {
    "extracted_text": "Financial Report Q4 2023\n\nExecutive Summary..."
  },
  "started_at": "2024-03-20T10:31:01Z",
  "completed_at": "2024-03-20T10:31:05Z"
}
```

3. Job completion:
   - All steps executed successfully: status set to `COMPLETED`
   - Any step fails: status set to `FAILED`
   - Final outputs and completion time are recorded

Example Completed Job:
```json
{
  "job_id": "job_abc123",
  "status": "COMPLETED",
  "started_at": "2024-03-20T10:31:00Z",
  "completed_at": "2024-03-20T10:31:10Z",
  "output_data": {
    "final_analysis": {
      "summary": "The Q4 2023 report shows...",
      "key_metrics": {
        "revenue": "10.5M",
        "growth": "15%"
      }
    }
  }
}
```

## 4. Job Control Operations

Available control operations during execution:

- `cancelJob(jobId)`: Stops job execution and marks as `FAILED`
- `resetJob(jobId)`: Resets job to initial `PENDING` state
- `clearInputs()`: Clears all input values and errors

Example Cancelled Job:
```json
{
  "job_id": "job_abc123",
  "status": "FAILED",
  "error_message": "Job cancelled by user",
  "started_at": "2024-03-20T10:31:00Z",
  "completed_at": "2024-03-20T10:31:15Z"
}
```

## 5. Job State Management

Jobs maintain the following state:

- Basic info (ID, name, description)
- Status (PENDING, RUNNING, COMPLETED, FAILED)
- Timestamps (created, started, completed)
- Input/output variables
- Step execution state
- Error messages (if any)

Example Job State:
```json
{
  "job_id": "job_abc123",
  "workflow_id": "wf_analyze_document",
  "name": "Analyze Q4 Report",
  "status": "RUNNING",
  "created_at": "2024-03-20T10:30:00Z",
  "updated_at": "2024-03-20T10:31:05Z",
  "started_at": "2024-03-20T10:31:00Z",
  "execution_progress": {
    "current_step": 1,
    "total_steps": 2,
    "is_paused": false
  },
  "live_output": "Processing page 3 of 10...",
  "steps": [
    {
      "step_id": "step_1",
      "status": "COMPLETED",
      "output_data": {
        "extracted_text": "Financial Report Q4 2023..."
      }
    },
    {
      "step_id": "step_2",
      "status": "RUNNING"
    }
  ]
}
```

## 6. Error Handling

The system handles various error conditions:

- Invalid inputs
- Missing required variables
- Tool execution failures
- Workflow validation errors
- Resource access errors

Each error condition results in:
- Appropriate error message capture
- Job/step status updates
- Execution state preservation

Example Error State:
```json
{
  "job_id": "job_abc123",
  "status": "FAILED",
  "error_message": "Failed to process PDF: File is password protected",
  "steps": [
    {
      "step_id": "step_1",
      "status": "FAILED",
      "error_message": "Failed to process PDF: File is password protected",
      "started_at": "2024-03-20T10:31:01Z",
      "completed_at": "2024-03-20T10:31:02Z"
    }
  ],
  "execution_progress": {
    "current_step": 0,
    "total_steps": 2,
    "is_paused": false
  }
}
``` 