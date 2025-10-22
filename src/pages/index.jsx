import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Jobs from "./Jobs";

import Clients from "./Clients";

import CreateJob from "./CreateJob";

import Employees from "./Employees";

import ServerPay from "./ServerPay";

import Settings from "./Settings";

import JobDetails from "./JobDetails";

import LogAttempt from "./LogAttempt";

import GenerateAffidavit from "./GenerateAffidavit";

import Accounting from "./Accounting";

import Home from "./Home";

import Directory from "./Directory";

import ClientDetails from "./ClientDetails";

import SignUp from "./SignUp";

import Login from "./Login";

import InviteSignUp from "./InviteSignUp";

import ForgotPassword from "./ForgotPassword";

import ResetPassword from "./ResetPassword";

import ChangePassword from "./ChangePassword";

import TemplateEditor from "./TemplateEditor";

import TemplatesManagement from "./TemplatesManagement";

import Companies from "./Companies";

import Subscriptions from "./Subscriptions";

import System from "./System";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { GlobalDataProvider } from "../components/GlobalDataContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";

const PAGES = {

    Dashboard: Dashboard,

    Jobs: Jobs,

    Clients: Clients,

    CreateJob: CreateJob,

    Employees: Employees,

    ServerPay: ServerPay,

    Settings: Settings,

    JobDetails: JobDetails,

    LogAttempt: LogAttempt,

    GenerateAffidavit: GenerateAffidavit,

    Accounting: Accounting,

    Home: Home,

    Directory: Directory,

    ClientDetails: ClientDetails,

    SignUp: SignUp,

    Login: Login,

    InviteSignUp: InviteSignUp,

    ForgotPassword: ForgotPassword,

    ResetPassword: ResetPassword,

    ChangePassword: ChangePassword,

    TemplatesManagement: TemplatesManagement,

    Companies: Companies,

    Subscriptions: Subscriptions,

    System: System,

}

function _getCurrentPage(url) {
    // Handle root path
    if (url === '/' || url === '') {
        return 'Home';
    }

    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Home';
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* Public routes for unauthenticated users */}
                <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
                <Route path="/Home" element={<PublicRoute><Home /></PublicRoute>} />
                <Route path="/SignUp" element={<PublicRoute><SignUp /></PublicRoute>} />
                <Route path="/Login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/InviteSignUp" element={<PublicRoute><InviteSignUp /></PublicRoute>} />
                <Route path="/ForgotPassword" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                <Route path="/ResetPassword" element={<PublicRoute><ResetPassword /></PublicRoute>} />

                {/* Protected routes for authenticated users */}
                <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/Jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
                <Route path="/Clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/CreateJob" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
                <Route path="/Employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                <Route path="/ServerPay" element={<ProtectedRoute><ServerPay /></ProtectedRoute>} />
                <Route path="/Settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/JobDetails" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
                <Route path="/LogAttempt" element={<ProtectedRoute><LogAttempt /></ProtectedRoute>} />
                <Route path="/GenerateAffidavit" element={<ProtectedRoute><GenerateAffidavit /></ProtectedRoute>} />
                <Route path="/Accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
                <Route path="/Directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
                <Route path="/ClientDetails" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
                <Route path="/ChangePassword" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route path="/TemplatesManagement" element={<ProtectedRoute><TemplatesManagement /></ProtectedRoute>} />
                <Route path="/settings/templates/new" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
                <Route path="/settings/templates/edit/:templateId" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
                <Route path="/Companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
                <Route path="/Subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
                <Route path="/System" element={<ProtectedRoute><System /></ProtectedRoute>} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <AuthProvider>
            <GlobalDataProvider>
                <Router>
                    <PagesContent />
                </Router>
            </GlobalDataProvider>
        </AuthProvider>
    );
}