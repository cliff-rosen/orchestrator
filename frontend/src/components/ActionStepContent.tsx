import { WorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';
import ActionEditor from './ActionEditor';

interface ActionStepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: WorkflowStep) => void;
}

const ActionStepContent: React.FC<ActionStepContentProps> = ({
    step,
    stateManager,
    onStepUpdate
}) => {
    return (
        <div>
            <ActionEditor
                step={step}
                stateManager={stateManager}
                onStepUpdate={onStepUpdate}
            />
        </div>
    );
};

export default ActionStepContent; 