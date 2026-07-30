import React from 'react';
import { VentilatorDisplayWindow } from './VentilatorDisplayWindow';
import { PatientMonitorWindow } from './PatientMonitorWindow';
import { MechanicsStationWindow } from './MechanicsStationWindow';
import { InstructorControlWindow } from './InstructorControlWindow';
import { PharmacopoeiaWindow } from './PharmacopoeiaWindow';
import { AttendingConsultWindow } from './AttendingConsultWindow';
import { ClinicalLogWindow } from './ClinicalLogWindow';
import { ReceptorBiophysicsWindow } from './ReceptorBiophysicsWindow';

export function DisplayRouter() {
  const params = new URLSearchParams(window.location.search);
  const displayType = params.get('display');

  if (displayType === 'vent') {
    return <VentilatorDisplayWindow />;
  }
  if (displayType === 'vitals') {
    return <PatientMonitorWindow />;
  }
  if (displayType === 'loops') {
    return <MechanicsStationWindow />;
  }
  if (displayType === 'instructor') {
    return <InstructorControlWindow />;
  }
  if (displayType === 'meds') {
    return <PharmacopoeiaWindow />;
  }
  if (displayType === 'attending') {
    return <AttendingConsultWindow />;
  }
  if (displayType === 'log') {
    return <ClinicalLogWindow />;
  }
  if (displayType === 'receptors') {
    return <ReceptorBiophysicsWindow />;
  }

  return null;
}
