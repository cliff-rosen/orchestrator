I'll map each navigation option to its corresponding business logic and analyze how the logic is factored across the codebase.

Let's examine each workflow execution entry point and trace the business logic behind it:

Ran tool

Ran tool


Now let me map each navigation option to its business logic and analyze how it's factored:

## 1. Switching to Run Mode (Edit Mode Toggle)

**UI Trigger**: `handleToggleEditMode` in `Workflow.tsx`

**Business Logic Flow**:
1. `resetWorkflowState()` - Resets workflow state without changing the active step
   - Located in `WorkflowContext.tsx`
   - Uses `updateWorkflowByAction({ type: 'RESET_EXECUTION', payload: {} })`
   - Filters out evaluation variables and jump counters
   - Clears output variable values
   - Sets `stepExecuted` to false and `stepRequestsInput` to true

2. Shows the input modal and sets the workflow to request input
   - `setShowInputModal(true)`
   - `setStepRequestsInput(true)`

3. Toggles the edit mode state
   - `setIsEditMode(!isEditMode)`

## 2. Starting a New Run (Restart)

**UI Trigger**: `handleNewQuestion` in `Workflow.tsx`

**Business Logic Flow**:
1. `resetWorkflow()` - Completely resets the workflow state
   - Located in `WorkflowContext.tsx`
   - Uses `updateWorkflowByAction({ type: 'RESET_EXECUTION', payload: {} })`
   - Filters out evaluation variables and jump counters
   - Clears output variable values
   - Sets `activeStep` to 0 (first step)
   - Sets `stepExecuted` to false and `stepRequestsInput` to true

2. Prepares for user input
   - `setStepRequestsInput(true)`
   - `setStepExecuted(false)`

## 3. Executing the Current Step

**UI Trigger**: `handleExecute` in `Workflow.tsx`

**Business Logic Flow**:
1. `executeCurrentStep()` - Executes the current workflow step
   - Located in `WorkflowContext.tsx`
   - Sets `isExecuting` to true
   - Gets the current step index
   - Calls `WorkflowEngine.executeStep(workflow, stepIndex, updateWorkflow)`
   - Sets `stepExecuted` to true when complete
   - Sets `isExecuting` to false when complete

2. The `WorkflowEngine.executeStep` method:
   - Located in `workflowEngine.ts`
   - Clears existing outputs for the step
   - Executes either `executeEvaluationStep` or `executeToolStep` based on step type
   - Updates workflow state with results

## 4. Submitting Input to Start Workflow

**UI Trigger**: `handleInputSubmit` in `Workflow.tsx`

**Business Logic Flow**:
1. Closes the input modal
   - `setShowInputModal(false)`
   
2. Indicates input is no longer required
   - `setStepRequestsInput(false)`

3. In `InputStepRunner.tsx`, the `handleInputSubmit` function:
   - Calls the `onInputSubmit` callback
   - This prepares the workflow to execute the current step

## 5. Moving to the Next Step

**UI Trigger**: `handleNext` in `Workflow.tsx`

**Business Logic Flow**:
1. `moveToNextStep()` - Advances to the next step in the workflow
   - Located in `WorkflowContext.tsx`
   - Calls `WorkflowEngine.getNextStepIndex(workflow, activeStep)`
   - Sets `activeStep` to the returned next step index
   - Sets `stepExecuted` to false

2. The `WorkflowEngine.getNextStepIndex` method:
   - Located in `workflowEngine.ts`
   - For evaluation steps, checks if a jump is needed based on evaluation results
   - Handles jump counter logic to prevent infinite loops
   - Returns the appropriate next step index

## 6. Automatic Execution via Evaluation Steps

**Logic Flow**:
1. When an evaluation step is executed, it evaluates conditions
   - `WorkflowEngine.evaluateConditions` in `workflowEngine.ts`
   - Checks variables against conditions
   - Returns evaluation result with next action

2. When moving to the next step, the evaluation result is used
   - `WorkflowEngine.getNextStepIndex` checks for jump actions
   - Handles jump counter logic
   - Returns the target step index if a jump is needed

## Architecture Analysis

The workflow execution logic is factored across several layers:

1. **UI Layer** (`Workflow.tsx`):
   - Contains event handlers that respond to user actions
   - Manages UI state (modals, loading indicators)
   - Delegates business logic to the context layer

2. **Context Layer** (`WorkflowContext.tsx`):
   - Provides workflow state management
   - Implements high-level workflow operations
   - Delegates core execution logic to the engine layer
   - Maintains UI-related state (activeStep, stepExecuted, etc.)

3. **Engine Layer** (`workflowEngine.ts`):
   - Contains the core business logic for workflow execution
   - Handles step execution, evaluation, and navigation
   - Manages workflow state updates
   - Implements the workflow execution algorithm

This separation of concerns follows a clean architecture pattern:

- **UI Components**: Handle user interactions and rendering
- **Context Provider**: Manages application state and coordinates operations
- **Engine**: Implements core business logic and algorithms

The factoring allows for:
1. **Reusability**: The engine can be used in different contexts (e.g., JobsContext also uses WorkflowEngine)
2. **Testability**: Business logic is isolated from UI concerns
3. **Maintainability**: Changes to UI don't affect business logic and vice versa

## Key Patterns

1. **Command Pattern**: The `updateWorkflowByAction` method uses a command pattern with action objects that describe state changes.

2. **Strategy Pattern**: Different execution strategies for different step types (action vs. evaluation).

3. **Repository Pattern**: The workflow state is managed centrally in the context, with the UI components accessing it through hooks.

4. **Observer Pattern**: React's context API implements an observer pattern where components subscribe to state changes.

5. **Factory Method**: Methods like `createNewStep` encapsulate the creation of complex objects.

This architecture provides a robust foundation for the workflow execution system, with clear separation of concerns and well-defined responsibilities for each layer.
