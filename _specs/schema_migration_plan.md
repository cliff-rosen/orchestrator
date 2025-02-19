# Schema System Migration Plan

This document outlines the step-by-step plan to migrate the codebase to the new schema and variable typing system.

## 1. Frontend Type Definitions

### Phase 1: Core Schema Types
1. Update `frontend/src/types/schema.ts`:
   - Replace existing type definitions with new `Schema`, `SchemaValueType`, and `FileValue` interfaces
   - Add branded `VariableName` type
   - Add `Variable` base interface
   - Add validation utilities for schema types

### Phase 2: Tool and Workflow Types
1. Update `frontend/src/types/tools.ts`:
   - Implement `ToolParameter` and `ToolOutput` interfaces
   - Update `Tool` interface to use new schema types
   
2. Update `frontend/src/types/workflows.ts`:
   - Add `WorkflowVariable` interface
   - Update `WorkflowStep` to use new variable mapping types
   - Update `Workflow` interface for new I/O handling

3. Update `frontend/src/types/jobs.ts`:
   - Add `JobVariable` interface
   - Update `JobStep` and `Job` interfaces
   - Implement execution state types

## 2. Backend Models

### Phase 1: Database Schema Updates
1. Update `backend/models.py`:
   - Add schema validation for new type system
   - Update variable storage format
   - Add support for file value types
   - Implement variable reference tracking

2. Create database migrations:
   - Convert existing variable data to new format
   - Add new fields for schema validation
   - Update foreign key relationships

### Phase 2: API Updates
1. Update API endpoints to handle:
   - Schema validation
   - Variable reference resolution
   - File upload/download with metadata
   - Type-safe variable mappings

## 3. Frontend Components

### Phase 1: Core Components
1. Update schema-related components:
   - Variable editors
   - Schema type selectors
   - File upload handlers
   - Value formatters

2. Update workflow editor components:
   - Variable mapping UI
   - Tool parameter binding
   - Input/output configuration

### Phase 2: Job Execution
1. Update job execution components:
   - Variable value display
   - Step execution state
   - File preview/download
   - Error handling

## 4. Testing and Validation

### Phase 1: Unit Tests
1. Add tests for:
   - Schema validation
   - Variable reference resolution
   - Type conversion
   - File handling

### Phase 2: Integration Tests
1. Add tests for:
   - Workflow execution
   - Variable mapping
   - File processing
   - Error scenarios

## 5. Migration Steps

1. **Preparation**
   - Create feature flag for new schema system
   - Add schema version tracking
   - Create data migration utilities

2. **Deployment**
   - Deploy schema validation changes
   - Run database migrations
   - Enable new type system under feature flag
   - Migrate existing workflows
   - Validate job execution

3. **Cleanup**
   - Remove old schema code
   - Clean up deprecated endpoints
   - Update documentation

## 6. Specific Files to Update

### Frontend
- [ ] `frontend/src/types/schema.ts`
- [ ] `frontend/src/types/tools.ts`
- [ ] `frontend/src/types/workflows.ts`
- [ ] `frontend/src/types/jobs.ts`
- [ ] `frontend/src/components/job/JobStepDetails.tsx`
- [ ] `frontend/src/components/DataFlowMapper.tsx`
- [ ] `frontend/src/components/StepDetail.tsx`
- [ ] `frontend/src/components/ActionStepRunner.tsx`
- [ ] `frontend/src/lib/api/jobsApi.ts`
- [ ] `frontend/src/lib/api/toolApi.ts`
- [ ] `frontend/src/components/ActionStepEditor.tsx`
- [ ] `frontend/src/pages/JobsManager.tsx`
- [ ] `frontend/src/pages/Job.tsx`
- [ ] `frontend/src/pages/WorkflowsManager.tsx`
- [ ] `frontend/src/context/JobsContext.tsx`
- [ ] `frontend/src/context/WorkflowContext.tsx`
- [ ] `frontend/src/components/job/WorkflowInputs.tsx`
- [ ] `frontend/src/components/job/WorkflowOutputs.tsx`

### Backend
- [ ] `backend/models.py`
- [ ] `backend/schemas.py`
- [ ] `backend/api/jobs.py`
- [ ] `backend/api/workflows.py`
- [ ] `backend/api/tools.py`
- [ ] Database migrations

## 7. Validation Checklist

Before deploying each phase:
- [ ] All type definitions are consistent
- [ ] Schema validation is comprehensive
- [ ] File handling is secure
- [ ] Variable references are tracked
- [ ] Error handling is complete
- [ ] Tests pass
- [ ] Migration scripts are tested
- [ ] Documentation is updated

## 8. Rollback Plan

1. **Immediate Issues**
   - Keep old schema code with feature flag
   - Maintain database backup
   - Version API endpoints

2. **Recovery Steps**
   - Disable feature flag
   - Restore database if needed
   - Roll back code changes
   - Notify users

## Timeline

1. **Week 1-2**: Frontend type definitions
2. **Week 3-4**: Backend models and migrations
3. **Week 5-6**: Frontend components
4. **Week 7**: Testing and validation
5. **Week 8**: Staged deployment and monitoring

## Success Metrics

1. All workflows successfully migrated
2. No data loss during migration
3. All tests passing
4. No regression in performance
5. Improved type safety verified
6. Reduced error rates in variable handling 