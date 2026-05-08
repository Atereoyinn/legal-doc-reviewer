export default function WorkflowStepper({ currentStep = 1 }) {
  const steps = [
    { id: 1, label: "Upload Document" },
    { id: 2, label: "Review Extraction" },
    { id: 3, label: "Ask Questions" },
  ];

  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div key={step.id}>
          <div className={`stepperItem ${getStepStatus(step.id, currentStep)}`}>
            <div className="stepperCircle">
              {step.id < currentStep ? (
                <span>✓</span>
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <div className="stepperLabel">{step.label}</div>
          </div>
          {index < steps.length - 1 && <div className={`stepperConnector ${getConnectorStatus(step.id, currentStep)}`} />}
        </div>
      ))}
    </div>
  );
}

function getStepStatus(stepId, currentStep) {
  if (stepId < currentStep) return "completed";
  if (stepId === currentStep) return "active";
  return "";
}

function getConnectorStatus(stepId, currentStep) {
  if (stepId < currentStep) return "completed";
  return "";
}
