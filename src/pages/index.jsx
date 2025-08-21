import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PartnerPortal from './PartnerPortal.jsx';
import PartnerSubmissions from './PartnerSubmissions.jsx';
import PartnerTraining from './PartnerTraining.jsx';
import PartnerIncentives from './PartnerIncentives.jsx';

export default function Pages() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PartnerPortal />} />
        <Route path="/submissions" element={<PartnerSubmissions />} />
        <Route path="/training" element={<PartnerTraining />} />
        <Route path="/incentives" element={<PartnerIncentives />} />
      </Routes>
    </BrowserRouter>
  );
}
