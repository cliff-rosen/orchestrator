# Workflow Context System Specification

## Overview
The workflow context system provides centralized state management and operations for workflows. It serves as the interface between the frontend components and the backend API, while also managing local state and operations.

## Local State vs Database Operations

The system maintains both local state and database operations for several key reasons:

### Local State (`localWorkflows`, `currentWorkflow`)
- Provides immediate access to data without network latency
- Enables optimistic UI updates before server confirmation
- Maintains consistent state across all components
- Allows temporary states (like unsaved changes) that don't exist in the DB
- Serves as a cache to reduce database load

### Database Operations (`fetchWorkflowsFromDB`, `saveWorkflowToDB`)
- Provides the source of truth for data
- Enables data persistence across sessions
- Allows synchronization with changes made by other users
- Provides recovery mechanism for corrupt local state
- Ensures data consistency in multi-user scenarios

This dual approach enables both responsive UI and data consistency. For example:
1. Creating a new workflow:
   - Immediately added to `localWorkflows` for instant UI feedback
   - Later saved to DB via `saveWorkflowToDB`
   
2. Listing workflows:
   - Display from `localWorkflows` for instant rendering
   - `fetchWorkflowsFromDB` used for initial load and manual refresh

## Service Consumers and Requirements

### WorkflowsManager Component
Displays and manages the list of workflows.

Required Services:
- `workflows: Workflow[]` - List of all workflows
- `createWorkflow(): void` - Create a new workflow
- `isLoading: boolean` - Loading state for list view
- `error: string | null` - Error state for list operations

### Workflow Component
Manages individual workflow editing and execution.

Required Services:
- `workflow: Workflow | null` - Currently active workflow
- `hasUnsavedChanges: boolean` - Whether current workflow has unsaved changes
- `updateWorkflow(updates: Partial<Workflow>): void` - Update current workflow
- `save(): Promise<void>` - Save current changes
- `isLoading: boolean` - Loading state for edit operations
- `error: string | null` - Error state for edit operations

### MenuBar Component
Handles workflow navigation and actions.

Required Services:
- `workflow: Workflow | null` - Current workflow
- `hasUnsavedChanges: boolean` - Whether there are unsaved changes
- `save(): Promise<void>` - Save current workflow
- `exitWorkflow(): void` - Set current workflow to null

### App Component
Manages application state and routing.

Required Services:
- `loadWorkflow(id: string): Promise<void>` - Load a workflow by ID
- `loadWorkflows(): Promise<void>` - Load all workflows
- `isLoading: boolean` - Global loading state

## Operation Categories

### User Operations
High-level operations that map to user actions:
- `createWorkflow(): void`
- `loadWorkflow(id: string): Promise<void>`
- `updateWorkflow(updates: Partial<Workflow>): void`
- `save(): Promise<void>`
- `exitWorkflow(): void`

### Internal Operations
Implementation details not exposed to components:
- `fetchFromDB(): Promise<void>`
- `saveToDB(): Promise<void>`
- `syncLocalState(): void`

## State Management

### Public State
State that components can access:
- `workflows: Workflow[]`
- `workflow: Workflow | null`
- `hasUnsavedChanges: boolean`
- `isLoading: boolean`
- `error: string | null`

### Internal State
State managed by the context but not exposed:
- Database operation status
- Sync status
- Cache validity

## State Transitions
1. Initial Load:
   - App calls `loadWorkflows()`
   - Context internally fetches and syncs state
   
2. Creating Workflow:
   - User triggers `createWorkflow()`
   - New workflow created in memory
   
3. Opening Workflow:
   - App calls `loadWorkflow(id)`
   - Context handles fetching if needed
   
4. Editing Workflow:
   - Component calls `updateWorkflow(updates)`
   - Context manages unsaved state
   
5. Saving Changes:
   - Component calls `save()`
   - Context determines and handles DB operations
   - Updates both `localWorkflows` and backend
   - Workflow component doesn't need to know which operation was performed
   
6. Exiting Workflow:
   - Component calls `exitWorkflow()`
   - Sets current workflow to null

Note: Handling of unsaved changes, user prompts, and navigation is managed by the components, not the context.

## Error Handling
- All database operations should set appropriate error messages
- Loading states should be managed for async operations
- Components should be able to access error states to display appropriate UI

## State Transitions
1. Initial Load:
   - `fetchWorkflowsFromDB` populates `localWorkflows`
   
2. Creating New Workflow:
   - `createLocalWorkflow` → sets `currentWorkflow` and `hasUnsavedChanges`
   
3. Selecting Workflow:
   - `selectWorkflow` → updates `currentWorkflow`
   
4. Editing Workflow:
   - `updateLocalWorkflow` → updates `currentWorkflow` and sets `hasUnsavedChanges`
   
5. Saving Changes:
   - `save()` → internally determines whether to create or update based on workflow state
   - Updates both `localWorkflows` and backend
   - Workflow component doesn't need to know which operation was performed
   
6. Navigation Away:
   - `clearCurrentWorkflow` → resets workflow state 