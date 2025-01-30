import { Workflow, WorkflowStatus, WorkflowStepType } from "../frontend/src/types/workflows";

const exampleWorkflow: Workflow = {
  workflow_id: "doc_search_workflow",
  name: "Document Search",
  status: WorkflowStatus.DRAFT,
  inputs: [{
    id: "query",
    name: "Search Query",
    description: "What to search for",
    schema: { name: "query", type: "string" }
  }],
  outputs: [{
    id: "results",
    name: "Search Results",
    description: "Found documents",
    schema: { name: "results", type: "array", items: { name: "document", type: "string" } }
  }],
  steps: [{
    id: "search_step",
    label: "Search Documents",
    description: "Search through document database",
    stepType: WorkflowStepType.ACTION,
    tool: {
      id: "search_tool",
      type: "search",
      name: "Document Search",
      description: "Searches document database",
      signature: {
        parameters: [{
          name: "searchQuery",
          type: "string"
        }],
        outputs: [{
          name: "documents",
          type: "string[]"
        }]
      }
    },
    parameterMappings: {
      "searchQuery": "query"  // Maps workflow input to tool parameter
    },
    outputMappings: {
      "documents": "results"  // Maps tool output to workflow output
    }
  }]
}