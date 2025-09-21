import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Jobs from "./Jobs";

import Clients from "./Clients";

import Invoicing from "./Invoicing";

import Payments from "./Payments";

import CreateJob from "./CreateJob";

import Employees from "./Employees";

import ServerPay from "./ServerPay";

import Settings from "./Settings";

import JobDetails from "./JobDetails";

import LogAttempt from "./LogAttempt";

import GenerateAffidavit from "./GenerateAffidavit";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Jobs: Jobs,
    
    Clients: Clients,
    
    Invoicing: Invoicing,
    
    Payments: Payments,
    
    CreateJob: CreateJob,
    
    Employees: Employees,
    
    ServerPay: ServerPay,
    
    Settings: Settings,
    
    JobDetails: JobDetails,
    
    LogAttempt: LogAttempt,
    
    GenerateAffidavit: GenerateAffidavit,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Jobs" element={<Jobs />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Invoicing" element={<Invoicing />} />
                
                <Route path="/Payments" element={<Payments />} />
                
                <Route path="/CreateJob" element={<CreateJob />} />
                
                <Route path="/Employees" element={<Employees />} />
                
                <Route path="/ServerPay" element={<ServerPay />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/JobDetails" element={<JobDetails />} />
                
                <Route path="/LogAttempt" element={<LogAttempt />} />
                
                <Route path="/GenerateAffidavit" element={<GenerateAffidavit />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}