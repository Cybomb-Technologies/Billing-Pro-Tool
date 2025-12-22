import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Table, Form, 
  InputGroup, Modal, Badge, Dropdown, Alert, Spinner 
} from 'react-bootstrap';
import { Shield, Building, GitBranch, BarChart2, Plus, RefreshCw, LogOut, Edit, Trash2, Power, MoreVertical, Search, Clock, Wallet, AlertTriangle, Package, Users, UserCheck, UserCog, Filter } from 'lucide-react';
import { superAdminService } from '../services/superAdminService';
import { ActivityLogTable } from '../components/ActivityLogTable';

// Shared Dashboard Components
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { PaymentChart } from '../components/dashboard/PaymentChart';

// Local helper if utils one is not available
const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

const SuperAdmin = () => {
    // Auth State
    const [adminKey, setAdminKey] = useState(localStorage.getItem('billing_admin_key') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('billing_admin_key'));

    // Data State
    const [organizations, setOrganizations] = useState([]);
    const [tenants, setTenants] = useState([]);
    
    // Dashboard States
    const [statsView, setStatsView] = useState('overview'); // 'overview' | 'branch'
    const [selectedOrgForStats, setSelectedOrgForStats] = useState('');
    const [selectedBranchSlug, setSelectedBranchSlug] = useState('');
    const [aggregatedStats, setAggregatedStats] = useState(null);
    const [branchStats, setBranchStats] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showOrgModal, setShowOrgModal] = useState(false);
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [logOrgId, setLogOrgId] = useState('');
    const [logBranchSlug, setLogBranchSlug] = useState('');
    
    // Filters
    const [orgSearch, setOrgSearch] = useState('');
    const [tenantSearch, setTenantSearch] = useState('');
    const [tenantFilterOrg, setTenantFilterOrg] = useState('');

    // Forms
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingTenant, setIsEditingTenant] = useState(false);
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentTenantId, setCurrentTenantId] = useState(null);
    
    const [orgForm, setOrgForm] = useState({ name: '', ownerEmail: '', password: '', planType: 'self' });
    const [tenantForm, setTenantForm] = useState({ organizationId: '', name: '', slug: '', status: 'active', adminEmail: '', adminPassword: '' });
    

    useEffect(() => {
        if (isAuthenticated) {
            fetchInitialData();
        }
    }, [isAuthenticated]);

    // Reset stats view when switching orgs
    useEffect(() => {
        setAggregatedStats(null);
        setBranchStats(null);
        setStatsView('overview');
        setSelectedBranchSlug('');
    }, [selectedOrgForStats]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (adminKey) {
            localStorage.setItem('billing_admin_key', adminKey);
            setIsAuthenticated(true);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('billing_admin_key');
        setAdminKey('');
        setIsAuthenticated(false);
        setOrganizations([]);
        setTenants([]);
    };

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const orgs = await superAdminService.getOrganizations(adminKey);
            const allTenants = await superAdminService.getTenants(adminKey);
            setOrganizations(orgs);
            setTenants(allTenants);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('Access Denied')) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    // --- ORGANIZATION HANDLERS ---
    
    const handleSaveOrg = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await superAdminService.updateOrganization(adminKey, currentOrgId, orgForm);
            } else {
                await superAdminService.createOrganization(adminKey, orgForm);
            }
            setShowOrgModal(false);
            setOrgForm({ name: '', ownerEmail: '', password: '', planType: 'self' });
            setIsEditing(false);
            setCurrentOrgId(null);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEditOrg = (org) => {
        setOrgForm({
            name: org.name,
            ownerEmail: org.ownerEmail,
            password: '', 
            planType: org.planType
        });
        setCurrentOrgId(org._id);
        setIsEditing(true);
        setShowOrgModal(true);
    };

    const handleDeleteOrg = async (id) => {
        if (!window.confirm('Are you sure? This will delete the organization reference.')) return;
        try {
            await superAdminService.deleteOrganization(adminKey, id);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleOrgStatus = async (org) => {
        const newStatus = org.status === 'active' ? 'inactive' : 'active';
        if (!window.confirm(`Mark this organization as ${newStatus}?`)) return;
        try {
            await superAdminService.toggleOrganizationStatus(adminKey, org._id, newStatus);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    // --- TENANT HANDLERS ---

    const handleSaveTenant = async (e) => {
        e.preventDefault();
        try {
            if (isEditingTenant) {
                 // For update, we only send name, slug, status
                 const updateData = {
                     name: tenantForm.name,
                     slug: tenantForm.slug,
                     status: tenantForm.status
                 };
                 await superAdminService.updateTenant(adminKey, currentTenantId, updateData);
            } else {
                 await superAdminService.createTenant(adminKey, tenantForm);
            }
            setShowTenantModal(false);
            setTenantForm({ organizationId: '', name: '', slug: '', status: 'active', adminEmail: '', adminPassword: '' });
            setIsEditingTenant(false);
            setCurrentTenantId(null);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEditTenant = (tenant) => {
        setTenantForm({
            organizationId: tenant.organizationId?._id || tenant.organizationId, // Handle population
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            adminEmail: '', // Not editable in simple update
            adminPassword: '' // Not editable in simple update
        });
        setCurrentTenantId(tenant._id);
        setIsEditingTenant(true);
        setShowTenantModal(true);
    };

    const handleDeleteTenant = async (id) => {
        if (!window.confirm('Are you sure? This will remove the branch record (DB will remain).')) return;
        try {
            await superAdminService.deleteTenant(adminKey, id);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleTenantStatus = async (tenant) => {
        const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
        try {
            await superAdminService.toggleTenantStatus(adminKey, tenant._id, newStatus);
            fetchInitialData();
        } catch (err) {
            alert(err.message);
        }
    };

    // --- DASHBOARD DATA HANDLERS ---

    const fetchAggregatedStats = async () => {
        if (!selectedOrgForStats) return;
        setLoading(true);
        try {
            const stats = await superAdminService.getAggregatedStats(adminKey, selectedOrgForStats);
            setAggregatedStats(stats);
            
            // Auto-select first branch if available
             if (stats?.branchDetails?.length > 0 && !selectedBranchSlug) {
                // Determine if we should set one default? Maybe better to let user choose
             }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchStats = async () => {
        if (!selectedOrgForStats || !selectedBranchSlug) return;
        setLoading(true);
        try {
            const data = await superAdminService.getBranchDetails(adminKey, selectedOrgForStats, selectedBranchSlug);
            setBranchStats(data);
        } catch (err) {
             setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBranchSlug && statsView === 'branch') {
            fetchBranchStats();
        }
    }, [selectedBranchSlug, statsView]);


    // --- FILTER & SORT ---
    const filteredOrgs = organizations.filter(org => {
        const search = orgSearch.toLowerCase();
        return org.name.toLowerCase().includes(search) || org.ownerEmail.toLowerCase().includes(search);
    });

    const filteredTenants = tenants.filter(tenant => {
        const search = tenantSearch.toLowerCase();
        const matchesSearch = tenant.name.toLowerCase().includes(search) || tenant.slug.toLowerCase().includes(search);
        const matchesOrg = tenantFilterOrg ? (tenant.organizationId?._id === tenantFilterOrg || tenant.organizationId === tenantFilterOrg) : true;
        return matchesSearch && matchesOrg;
    });


    // --- Render Login Screen ---
    if (!isAuthenticated) {
        return (
            <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f4f6f9' }}>
                <Card className="shadow-sm border-0" style={{ width: '400px' }}>
                    <Card.Body className="p-4 text-center">
                        <Shield className="text-primary mb-3" size={48} />
                        <h3 className="mb-4">Super Admin Access</h3>
                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3">
                                <Form.Control 
                                    type="password" 
                                    placeholder="Enter Admin Key" 
                                    value={adminKey} 
                                    onChange={(e) => setAdminKey(e.target.value)} 
                                    required 
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit" className="w-100">Unlock Dashboard</Button>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // --- Render Main Dashboard ---
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
            {/* Header */}
            <div className="bg-white shadow-sm py-3 mb-4 sticky-top">
                <Container fluid className="px-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <Shield className="text-primary" size={28} />
                            <h4 className="mb-0 fw-bold text-gray-800">Super Admin Control</h4>
                        </div>
                        <div className="d-flex gap-2">
                             <Button 
                                variant={activeTab === 'dashboard' ? 'dark' : 'light'} 
                                onClick={() => setActiveTab('dashboard')}
                                size="sm"
                             >
                                 <BarChart2 size={16} className="me-2"/> Dashboard
                             </Button>
                             <Button 
                                variant={activeTab === 'organizations' ? 'dark' : 'light'} 
                                onClick={() => setActiveTab('organizations')}
                                size="sm"
                             >
                                 <Building size={16} className="me-2"/> Clients
                             </Button>
                             <Button 
                                variant={activeTab === 'tenants' ? 'dark' : 'light'} 
                                onClick={() => setActiveTab('tenants')}
                                size="sm"
                             >
                                 <GitBranch size={16} className="me-2"/> Branches
                             </Button>
                             <Button 
                                variant={activeTab === 'logs' ? 'dark' : 'light'} 
                                onClick={() => setActiveTab('logs')}
                                size="sm"
                             >
                                 <Clock size={16} className="me-2"/> Activity Logs
                             </Button>
                             <div className="vr mx-2"></div>
                             <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                                <LogOut size={16} className="me-2" /> Logout
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>

            <Container fluid className="px-4">
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

                {/* --- TAB 1: ORGANIZATIONS --- */}
                {activeTab === 'organizations' && (
                    <Card className="border-0 shadow-sm animation-fade-in">
                        <Card.Body>
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                                <h5 className="mb-0 fw-bold">Client Organizations</h5>
                                <div className="d-flex gap-3">
                                    <InputGroup style={{width: '300px'}}>
                                        <InputGroup.Text className="bg-white border-end-0"><Search size={16} className="text-muted"/></InputGroup.Text>
                                        <Form.Control 
                                            placeholder="Search clients..." 
                                            className="border-start-0 ps-0"
                                            value={orgSearch} 
                                            onChange={(e) => setOrgSearch(e.target.value)}
                                        />
                                    </InputGroup>
                                    <Button variant="primary" onClick={() => {
                                        setIsEditing(false);
                                        setOrgForm({ name: '', ownerEmail: '', password: '', planType: 'self' });
                                        setShowOrgModal(true);
                                    }}>
                                        <Plus size={16} className="me-2" /> Add Client
                                    </Button>
                                </div>
                            </div>
                            <div className="table-responsive">
                                <Table hover className="align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Name</th>
                                            <th>Owner Email</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                            <th>Created At</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrgs.map(org => (
                                            <tr key={org._id}>
                                                <td className="fw-medium">{org.name}</td>
                                                <td>{org.ownerEmail}</td>
                                                <td>
                                                    <Badge bg={org.planType === 'organization' ? 'purple-soft' : 'secondary'} className={org.planType === 'organization' ? 'text-purple' : ''}>
                                                        {org.planType === 'organization' ? 'Multi-Branch' : 'Self-Owned'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge bg={org.status === 'active' ? 'success' : 'danger'}>
                                                        {org.status || 'Active'}
                                                    </Badge>
                                                </td>
                                                <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                                                <td className="text-end">
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant="light" size="sm" className="btn-icon">
                                                            <MoreVertical size={16} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu align="end">
                                                            <Dropdown.Item onClick={() => handleEditOrg(org)}>
                                                                <Edit size={14} className="me-2 text-primary" /> Edit Details
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleToggleOrgStatus(org)}>
                                                                <Power size={14} className={`me-2 ${org.status === 'active' ? 'text-warning' : 'text-success'}`} /> 
                                                                {org.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item onClick={() => handleDeleteOrg(org._id)} className="text-danger">
                                                                <Trash2 size={14} className="me-2" /> Delete
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredOrgs.length === 0 && (
                                            <tr><td colSpan="6" className="text-center text-muted py-5">No organizations found matching your search.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* --- TAB 2: TENANTS --- */}
                {activeTab === 'tenants' && (
                    <Card className="border-0 shadow-sm animation-fade-in">
                        <Card.Body>
                             <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                                <h5 className="mb-0 fw-bold">Branch Database Management</h5>
                                <div className="d-flex gap-3">
                                     <Form.Select 
                                        style={{width: '200px'}} 
                                        value={tenantFilterOrg}
                                        onChange={(e) => setTenantFilterOrg(e.target.value)}
                                     >
                                        <option value="">All Clients</option>
                                        {organizations.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                     </Form.Select>
                                    <InputGroup style={{width: '300px'}}>
                                        <InputGroup.Text className="bg-white border-end-0"><Search size={16} className="text-muted"/></InputGroup.Text>
                                        <Form.Control 
                                            placeholder="Search branches..." 
                                            className="border-start-0 ps-0"
                                            value={tenantSearch} 
                                            onChange={(e) => setTenantSearch(e.target.value)}
                                        />
                                    </InputGroup>
                                    <Button variant="success" onClick={() => {
                                        setIsEditingTenant(false);
                                        setTenantForm({ organizationId: '', name: '', slug: '', status: 'active', adminEmail: '', adminPassword: '' });
                                        setShowTenantModal(true);
                                    }}>
                                        <Plus size={16} className="me-2" /> Add Branch
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="table-responsive">
                                <Table hover className="align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Branch Name</th>
                                            <th>Slug (ID)</th>
                                            <th>Client (Org)</th>
                                            <th>Status</th>
                                            <th>Connection</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTenants.map(tenant => (
                                            <tr key={tenant._id}>
                                                <td className="fw-medium">{tenant.name}</td>
                                                <td><Badge bg="light" text="dark" className="border">@{tenant.slug}</Badge></td>
                                                <td>{tenant.organizationId?.name || <span className="text-muted">Unassigned</span>}</td>
                                                <td>
                                                    <Badge bg={tenant.status === 'active' ? 'success' : 'secondary'}>
                                                        {tenant.status}
                                                    </Badge>
                                                </td>
                                                <td><small className="text-muted">Managed (MongoDB)</small></td>
                                                <td className="text-end">
                                                     <Dropdown>
                                                        <Dropdown.Toggle variant="light" size="sm" className="btn-icon">
                                                            <MoreVertical size={16} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu align="end">
                                                            <Dropdown.Item onClick={() => handleEditTenant(tenant)}>
                                                                <Edit size={14} className="me-2 text-primary" /> Edit Details
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => handleToggleTenantStatus(tenant)}>
                                                                <Power size={14} className={`me-2 ${tenant.status === 'active' ? 'text-warning' : 'text-success'}`} /> 
                                                                {tenant.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item onClick={() => handleDeleteTenant(tenant._id)} className="text-danger">
                                                                <Trash2 size={14} className="me-2" /> Delete
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredTenants.length === 0 && (
                                            <tr><td colSpan="6" className="text-center text-muted py-5">No branches found.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* --- TAB: DASHBOARD (Replaces Reports) --- */}
                {activeTab === 'dashboard' && (
                    <div className="animation-fade-in">
                         {/* GLOBAL SYSTEM OVERVIEW */}
                         <Row className="mb-4 g-3">
                            <Col md={3}>
                                <StatCard 
                                    title="Total Clients" 
                                    value={organizations.length} 
                                    subtext="Registered Organizations" 
                                    icon={Building} 
                                    color="primary" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Total Branches" 
                                    value={tenants.length} 
                                    subtext="All Provisioned Databases" 
                                    icon={GitBranch} 
                                    color="info" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Active Branches" 
                                    value={tenants.filter(t => t.status === 'active').length} 
                                    subtext="Operational Units" 
                                    icon={Shield} 
                                    color="success" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Multi-Branch Clients" 
                                    value={organizations.filter(o => o.planType === 'organization').length} 
                                    subtext="Enterprise Accounts" 
                                    icon={Users} 
                                    color="warning" 
                                />
                            </Col>
                         </Row>

                         <Card className="border-0 shadow-sm mb-4">
                            <Card.Body>
                                <Row className="align-items-end g-3">
                                    <Col md={4}>
                                        <Form.Label className="fw-bold">Client Drill-Down</Form.Label>
                                        <Form.Select 
                                            value={selectedOrgForStats} 
                                            onChange={(e) => setSelectedOrgForStats(e.target.value)}
                                            size="lg"
                                        >
                                            <option value="">-- Select Client for Details --</option>
                                            {organizations.map(org => (
                                                <option key={org._id} value={org._id}>{org.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Col>
                                    <Col md={2}>
                                        <Button 
                                            variant="primary" 
                                            className="w-100" 
                                            size="lg"
                                            onClick={fetchAggregatedStats}
                                            disabled={!selectedOrgForStats || loading}
                                        >
                                            {loading ? <Spinner size="sm" animation="border" /> : <><RefreshCw size={16} className="me-2" /> Load Data</>}
                                        </Button>
                                    </Col>

                                     {/* View Switcher only visible when stats loaded */}
                                     {aggregatedStats && (
                                        <Col md={6} className="d-flex justify-content-end align-items-center gap-2">
                                             <Button 
                                                variant={statsView === 'overview' ? 'dark' : 'light'}
                                                onClick={() => setStatsView('overview')}
                                             >
                                                <BarChart2 size={16} className="me-2" /> Overview
                                             </Button>
                                             <Button 
                                                variant={statsView === 'branch' ? 'dark' : 'light'}
                                                onClick={() => setStatsView('branch')}
                                             >
                                                <GitBranch size={16} className="me-2" /> Branch Details
                                             </Button>
                                        </Col>
                                     )}
                                </Row>
                            </Card.Body>
                         </Card>
                         
                         {/* --- SUB TAB 1: OVERVIEW (Aggregated) --- */}
                         {aggregatedStats && statsView === 'overview' && (
                             <>
                                {/* 1. KEY METRICS ROW */}
                                <Row className="mb-4 g-3">
                                    <Col md={3}>
                                        <StatCard 
                                            title="Total Revenue" 
                                            value={formatMoney(aggregatedStats.totalRevenue)} 
                                            subtext="Across active branches" 
                                            icon={Wallet} 
                                            color="success" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Outstanding" 
                                            value={formatMoney(aggregatedStats.totalOutstanding)} 
                                            subtext="Pending Collection" 
                                            icon={AlertTriangle} 
                                            color="danger" 
                                        />
                                    </Col>
                                     <Col md={3}>
                                        <StatCard 
                                            title="Total Invoices" 
                                            value={aggregatedStats.totalInvoices} 
                                            subtext="Transactions" 
                                            icon={BarChart2} 
                                            color="primary" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Active Branches" 
                                            value={aggregatedStats.branchCount} 
                                            subtext="Operational Units" 
                                            icon={GitBranch} 
                                            color="info" 
                                        />
                                    </Col>
                                </Row>

                                {/* 2. CHARTS ROW */}
                                <Row className="mb-4 g-4">
                                    <Col md={8}>
                                        <SalesChart data={aggregatedStats.charts?.salesData} />
                                    </Col>
                                    <Col md={4}>
                                        <PaymentChart data={aggregatedStats.charts?.paymentData} />
                                    </Col>
                                </Row>

                                {/* 3. BRANCH BREAKDOWN TABLE */}
                                <Card className="border-0 shadow-sm">
                                    <Card.Header className="bg-white py-3">
                                        <h6 className="mb-0 fw-bold">Branch Breakdown</h6>
                                    </Card.Header>
                                    <Table hover className="align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Branch Name</th>
                                                <th>Slug</th>
                                                <th className="text-end">Revenue</th>
                                                <th className="text-end">Outstanding</th>
                                                <th className="text-center">Invoices</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aggregatedStats.branchDetails.map((branch, idx) => (
                                                <tr key={idx}>
                                                    <td className="fw-medium">{branch.name}</td>
                                                    <td><Badge bg="light" text="dark" className="border">{branch.slug}</Badge></td>
                                                    <td className="text-end text-success fw-bold">{formatMoney(branch.revenue)}</td>
                                                    <td className="text-end text-danger">{formatMoney(branch.outstanding)}</td>
                                                    <td className="text-center">{branch.invoiceCount}</td>
                                                </tr>
                                            ))}
                                            {aggregatedStats.branchDetails.length === 0 && (
                                                <tr><td colSpan="5" className="text-center py-3">No branch data available</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card>
                             </>
                         )}

                         {/* --- SUB TAB 2: BRANCH DETAILS (Deep Dive) --- */}
                         {aggregatedStats && statsView === 'branch' && (
                             <div className="animation-fade-in">
                                 {/* Toolbar */}
                                <Card className="mb-4 border-0 shadow-sm">
                                    <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between p-3">
                                        <div className="d-flex align-items-center gap-2" style={{minWidth: '300px'}}>
                                            <label className="fw-bold text-muted small text-nowrap">Select Branch:</label>
                                            <Form.Select 
                                                value={selectedBranchSlug} 
                                                onChange={(e) => setSelectedBranchSlug(e.target.value)}
                                                className="fw-bold bg-light border-0"
                                            >
                                                <option value="">-- Choose Branch --</option>
                                                {aggregatedStats.branchDetails.map(b => (
                                                    <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                                                ))}
                                            </Form.Select>
                                        </div>
                                    </Card.Body>
                                </Card>
                                
                                {loading && <div className="text-center py-5"><Spinner animation="border"/></div>}

                                {branchStats ? (
                                     <>
                                        {/* 1. KEY STATS */}
                                        <Row className="mb-4 g-3">
                                            <Col md={3}>
                                                <StatCard 
                                                    title="Revenue" 
                                                    value={formatMoney(branchStats.stats.totalRevenue)} 
                                                    icon={Wallet} 
                                                    color="success" 
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <StatCard 
                                                    title="Outstanding" 
                                                    value={formatMoney(branchStats.stats.totalOutstanding)} 
                                                    icon={AlertTriangle} 
                                                    color="danger" 
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <StatCard 
                                                    title="Customers" 
                                                    value={branchStats.stats.totalCustomers} 
                                                    icon={Users} 
                                                    color="primary" 
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <StatCard 
                                                    title="Inventory Value" 
                                                    value={formatMoney(branchStats.stats.inventoryValue)} 
                                                    icon={Package} 
                                                    color="info" 
                                                />
                                            </Col>
                                        </Row>
                                        
                                        {/* 2. SECONDARY STATS */}
                                        <Row className="mb-4 g-3">
                                            <Col md={3}>
                                                <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                                    <span className="text-muted small fw-bold">TOTAL PRODUCTS</span>
                                                    <span className="fw-bold h5 mb-0">{branchStats.stats.totalProducts}</span>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center border-start border-4 border-warning">
                                                    <span className="text-muted small fw-bold">LOW STOCK ITEMS</span>
                                                    <span className="fw-bold h5 mb-0 text-warning">{branchStats.stats.lowStockCount}</span>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                                    <span className="text-muted small fw-bold">STAFF USERS</span>
                                                    <span className="fw-bold h5 mb-0">{branchStats.stats.users?.staff}</span>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                                    <span className="text-muted small fw-bold">ADMIN USERS</span>
                                                    <span className="fw-bold h5 mb-0">{branchStats.stats.users?.admin}</span>
                                                </div>
                                            </Col>
                                        </Row>

                                        {/* 3. CHARTS */}
                                        <Row className="mb-4 g-4">
                                            <Col md={8}>
                                                <SalesChart data={branchStats.charts?.salesData} title="Branch Sales Performance" />
                                            </Col>
                                            <Col md={4}>
                                                <PaymentChart data={branchStats.charts?.paymentData} title="Payment Distribution" />
                                            </Col>
                                        </Row>

                                        {/* 4. TABLES */}
                                        <Row className="g-4">
                                            <Col md={6}>
                                                <Card className="border-0 shadow-sm h-100">
                                                    <Card.Header className="bg-white py-3 border-bottom">
                                                        <h6 className="mb-0 fw-bold">Recent Invoices</h6>
                                                    </Card.Header>
                                                    <Table hover className="mb-0 small align-middle">
                                                        <thead className="bg-light">
                                                            <tr><th>Inv #</th><th>Date</th><th>Customer</th><th>Total</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {branchStats.recentInvoices.map((inv, i) => (
                                                                <tr key={i}>
                                                                    <td>{inv.invoiceNumber}</td>
                                                                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                                                                    <td className="text-truncate" style={{maxWidth: '100px'}}>{inv.customerName}</td>
                                                                    <td className="fw-bold">{formatMoney(inv.total)}</td>
                                                                </tr>
                                                            ))}
                                                            {branchStats.recentInvoices.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
                                                        </tbody>
                                                    </Table>
                                                </Card>
                                            </Col>
                                            <Col md={6}>
                                                <Card className="border-0 shadow-sm h-100">
                                                    <Card.Header className="bg-white py-3 border-bottom">
                                                        <h6 className="mb-0 fw-bold">Top Products</h6>
                                                    </Card.Header>
                                                    <Table hover className="mb-0 small align-middle">
                                                        <thead className="bg-light">
                                                            <tr><th>Product</th><th>Price</th><th>Stock</th><th>Sold</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {branchStats.topProducts.map((p, i) => (
                                                                <tr key={i}>
                                                                    <td className="text-truncate" style={{maxWidth: '120px'}}>{p.name}</td>
                                                                    <td>{formatMoney(p.price)}</td>
                                                                    <td>{p.stock}</td>
                                                                    <td className="fw-bold text-success">{p.sold || 0}</td>
                                                                </tr>
                                                            ))}
                                                            {branchStats.topProducts.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
                                                        </tbody>
                                                    </Table>
                                                </Card>
                                            </Col>
                                        </Row>
                                     </>
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <GitBranch size={48} className="mb-3 opacity-25" />
                                        <h5>Select a branch to view detailed stats</h5>
                                    </div>
                                )}
                             </div>
                         )}

                         {!aggregatedStats && !loading && (
                             <div className="text-center py-5 text-muted">
                                 <Shield size={48} className="mb-3 opacity-25" />
                                 <h5>Select an organization to view stats</h5>
                                 <p>Choose a client from the dropdown above to load their aggregated data.</p>
                             </div>
                         )}
                    </div>
                )}


                {/* --- TAB: LOGS --- */}
                {activeTab === 'logs' && (
                    <div className="animation-fade-in">
                        <ActivityLogTable 
                            contextToken={adminKey} 
                            isSuperAdmin={true} 
                            organizations={organizations}
                            tenants={tenants}
                        />
                    </div>
                )}
            </Container>

            {/* --- ADD / EDIT ORGANIZATION MODAL --- */}
            <Modal show={showOrgModal} onHide={() => setShowOrgModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Client Details' : 'Add New Client'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSaveOrg}>
                        <Form.Group className="mb-3">
                            <Form.Label>Business Name</Form.Label>
                            <Form.Control required type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} placeholder="e.g. Acme Corp" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Owner Email</Form.Label>
                            <Form.Control required type="email" value={orgForm.ownerEmail} onChange={e => setOrgForm({...orgForm, ownerEmail: e.target.value})} placeholder="owner@acme.com" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Organization Type</Form.Label>
                            <Form.Select value={orgForm.planType} onChange={e => setOrgForm({...orgForm, planType: e.target.value})}>
                                <option value="self">Single Branch (Self)</option>
                                <option value="organization">Multi-Branch (Client Admin)</option>
                            </Form.Select>
                            <Form.Text className="text-muted small">
                                'Multi-Branch' enables the Client Admin Dashboard.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password {isEditing && <span className="text-muted fw-normal">(Leave blank to keep current)</span>}</Form.Label>
                            <Form.Control 
                                required={!isEditing} 
                                type="password" 
                                value={orgForm.password} 
                                onChange={e => setOrgForm({...orgForm, password: e.target.value})} 
                                placeholder={isEditing ? "New Password (Optional)" : "Client Login Password"} 
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                             <Button variant="light" onClick={() => setShowOrgModal(false)}>Cancel</Button>
                             <Button variant="primary" type="submit">{isEditing ? 'Save Changes' : 'Create Client'}</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* --- ADD / EDIT TENANT MODAL --- */}
            <Modal show={showTenantModal} onHide={() => setShowTenantModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditingTenant ? 'Edit Branch' : 'Provision New Branch'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {!isEditingTenant && (
                         <Alert variant="info" className="small mb-4">
                            This will create a new isolated database for the branch.
                         </Alert>
                    )}
                    <Form onSubmit={handleSaveTenant}>
                        <Form.Group className="mb-3">
                            <Form.Label>Select Client Organization</Form.Label>
                            <Form.Select 
                                required 
                                value={tenantForm.organizationId} 
                                onChange={e => setTenantForm({...tenantForm, organizationId: e.target.value})}
                                disabled={isEditingTenant}
                            >
                                <option value="">-- Choose Organization --</option>
                                {organizations.map(org => (
                                    <option key={org._id} value={org._id}>{org.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Branch Name</Form.Label>
                            <Form.Control required type="text" value={tenantForm.name} onChange={e => setTenantForm({...tenantForm, name: e.target.value})} placeholder="e.g. Downton Store" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Unique Slug (ID)</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>@</InputGroup.Text>
                                <Form.Control required type="text" value={tenantForm.slug} onChange={e => setTenantForm({...tenantForm, slug: e.target.value})} placeholder="downtown-store" />
                            </InputGroup>
                            <Form.Text className="text-muted small">Unique identifier used for specific branch routes.</Form.Text>
                        </Form.Group>

                        {isEditingTenant && (
                             <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select value={tenantForm.status} onChange={e => setTenantForm({...tenantForm, status: e.target.value})}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </Form.Select>
                            </Form.Group>
                        )}

                        {!isEditingTenant && (
                            <>
                                <hr className="my-4" />
                                <h6 className="mb-3 text-primary">Initial Admin User</h6>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>Admin Email</Form.Label>
                                    <Form.Control required type="email" value={tenantForm.adminEmail} onChange={e => setTenantForm({...tenantForm, adminEmail: e.target.value})} placeholder="admin@branch.com" />
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label>Admin Password</Form.Label>
                                    <Form.Control required type="password" value={tenantForm.adminPassword} onChange={e => setTenantForm({...tenantForm, adminPassword: e.target.value})} placeholder="Type a strong password" />
                                </Form.Group>
                            </>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4">
                             <Button variant="light" onClick={() => setShowTenantModal(false)}>Cancel</Button>
                             <Button variant={isEditingTenant ? 'primary' : 'success'} type="submit">
                                 {isEditingTenant ? 'Save Changes' : 'Provision Database'}
                             </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default SuperAdmin;
