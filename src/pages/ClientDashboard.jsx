import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { 
    BarChart2, GitBranch, LogOut, ShieldCheck, BarChart3,
    Users, Package, AlertTriangle, Wallet, UserCheck, UserCog
} from 'lucide-react';
import { ActivityLogTable } from '../components/ActivityLogTable';
import { useAuth } from '../context/AuthContext'; 
import { API_BASE_URL } from '../config';

// Shared Dashboard Components
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { PaymentChart } from '../components/dashboard/PaymentChart';

const ClientDashboard = () => {
    const { logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchData, setBranchData] = useState(null);
    const [branchLoading, setBranchLoading] = useState(false);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/client-admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Effect: Select first branch by default when stats load
    useEffect(() => {
        if (stats?.branchDetails?.length > 0 && !selectedBranch) {
            setSelectedBranch(stats.branchDetails[0].slug);
        }
    }, [stats]);

    // Effect: Fetch branch data when selectedBranch changes
    useEffect(() => {
        if (selectedBranch && activeTab === 'branches') {
            fetchBranchData(selectedBranch);
        }
    }, [selectedBranch, activeTab]);

    const fetchBranchData = async (slug) => {
        setBranchLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/client-admin/branch/${slug}/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load branch data');
            const data = await res.json();
            setBranchData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setBranchLoading(false);
        }
    };

    const handleExport = async (type) => {
        if (!selectedBranch) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/client-admin/branch/${selectedBranch}/export/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Export failed');
            const { fileName, fields, data } = await res.json();
            
            // Simple CSV generation
            const header = fields.join(',') + '\n';
            const rows = data.map(row => fields.map(field => `"${row[field]}"`).join(',')).join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
        } catch (error) {
            alert('Failed to export data');
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
            {/* Header */}
            <div className="bg-white shadow-sm py-3 mb-4 sticky-top">
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <ShieldCheck className="text-primary" size={32} />
                            <div>
                                <h4 className="mb-0 fw-bold text-dark">Organization Admin</h4>
                                <small className="text-muted fw-semibold">{stats?.organizationName}</small>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                             <Button 
                                variant={activeTab === 'overview' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('overview')}
                             >
                                 <BarChart3 size={16} className="me-2"/>Overview
                             </Button>
                             <Button 
                                variant={activeTab === 'branches' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('branches')}
                             >
                                 <GitBranch size={16} className="me-2"/>Branch Details
                             </Button>
                             <div className="vr mx-2"></div>
                            <Button variant="outline-danger" size="sm" onClick={logout}>
                                <LogOut size={16} className="me-2" /> Logout
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>

            <Container fluid className="px-4">
                {error && <Alert variant="danger">{error}</Alert>}

                {activeTab === 'overview' && stats && stats.stats && (
                    <div className="animation-fade-in">
                         {/* 1. KEY METRICS ROW */}
                        <Row className="mb-4 g-3">
                            <Col md={3}>
                                <StatCard 
                                    title="Total Revenue" 
                                    value={formatMoney(stats.stats.totalRevenue)} 
                                    subtext="Across all branches" 
                                    icon={Wallet} 
                                    color="success" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Outstanding" 
                                    value={formatMoney(stats.stats.totalOutstanding)} 
                                    subtext="Pending Collection" 
                                    icon={AlertTriangle} 
                                    color="danger" 
                                />
                            </Col>
                             <Col md={3}>
                                <StatCard 
                                    title="Inventory Value" 
                                    value={formatMoney(stats.stats.inventoryValue)} 
                                    subtext="Total Stock Assets" 
                                    icon={Package} 
                                    color="info" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Active Branches" 
                                    value={stats.branchCount} 
                                    subtext="Operational Units" 
                                    icon={GitBranch} 
                                    color="primary" 
                                />
                            </Col>
                        </Row>

                        {/* 2. SECONDARY METRICS ROW */}
                        <Row className="mb-4 g-3">
                            <Col md={2}>
                                <StatCard title="Total Invoices" value={stats.stats.totalInvoices} icon={BarChart2} color="secondary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Customers" value={stats.stats.totalCustomers} icon={Users} color="secondary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Products" value={stats.stats.totalProducts} icon={Package} color="secondary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Low Stock" value={stats.stats.lowStockCount} icon={AlertTriangle} color="warning" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Staff" value={stats.stats.totalStaff} icon={UserCheck} color="info" />
                            </Col>
                             <Col md={2}>
                                <StatCard title="Admins" value={stats.stats.totalAdmins} icon={UserCog} color="dark" />
                            </Col>
                        </Row>

                        {/* 3. CHARTS ROW */}
                        <Row className="mb-4 g-4">
                            <Col md={8}>
                                <SalesChart data={stats.charts?.salesData} />
                            </Col>
                            <Col md={4}>
                                <PaymentChart data={stats.charts?.paymentData} />
                            </Col>
                        </Row>

                        {/* 4. BRANCH LIST */}
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-white py-3 border-bottom">
                                <h6 className="mb-0 fw-bold">Branch Performance Summary</h6>
                            </Card.Header>
                            <div className="table-responsive">
                                <Table hover className="align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Branch Name</th>
                                            <th className="text-end">Revenue</th>
                                            <th className="text-end">Outstanding</th>
                                            <th className="text-center">Invoices</th>
                                            <th className="text-center">Products</th>
                                            <th className="text-center">Inventory Val</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.branchDetails.map((branch, idx) => (
                                            <tr key={idx}>
                                                <td className="fw-medium">{branch.name} <br/> <small className="text-muted">{branch.slug}</small></td>
                                                <td className="text-end fw-bold text-success">{formatMoney(branch.revenue)}</td>
                                                <td className="text-end text-danger">{formatMoney(branch.outstanding)}</td>
                                                <td className="text-center">{branch.invoiceCount}</td>
                                                <td className="text-center">{branch.products}</td>
                                                <td className="text-center text-muted">{formatMoney(branch.inventoryVal)}</td>
                                                <td className="text-center">
                                                    {branch.error ? 
                                                        <Badge bg="danger">Offline</Badge> : 
                                                        <Badge bg="success">Active</Badge>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'branches' && (
                    <div className="animation-fade-in">
                        {/* Toolbar */}
                        <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between p-3">
                                <div className="d-flex align-items-center gap-2" style={{minWidth: '300px'}}>
                                    <label className="fw-bold text-muted small text-nowrap">Select Branch:</label>
                                    <Form.Select 
                                        value={selectedBranch} 
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="fw-bold bg-light border-0"
                                    >
                                        {stats?.branchDetails?.map(b => (
                                            <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                                        ))}
                                    </Form.Select>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-success" size="sm" onClick={() => handleExport('invoices')} disabled={!branchData}>
                                        <BarChart2 size={16} className="me-2" /> Export Invoices
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={() => handleExport('products')} disabled={!branchData}>
                                        <Package size={16} className="me-2" /> Export Products
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Branch Content */}
                        {branchLoading ? (
                            <div className="text-center py-5">
                                 <Spinner animation="border" variant="secondary" />
                            </div>
                        ) : branchData ? (
                            <>
                                {/* 1. KEY STATS */}
                                <Row className="mb-4 g-3">
                                    <Col md={3}>
                                        <StatCard 
                                            title="Revenue" 
                                            value={formatMoney(branchData.stats.totalRevenue)} 
                                            icon={Wallet} 
                                            color="success" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Outstanding" 
                                            value={formatMoney(branchData.stats.totalOutstanding)} 
                                            icon={AlertTriangle} 
                                            color="danger" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Customers" 
                                            value={branchData.stats.totalCustomers} 
                                            icon={Users} 
                                            color="primary" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Inventory Value" 
                                            value={formatMoney(branchData.stats.inventoryValue)} 
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
                                            <span className="fw-bold h5 mb-0">{branchData.stats.totalProducts}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center border-start border-4 border-warning">
                                            <span className="text-muted small fw-bold">LOW STOCK ITEMS</span>
                                            <span className="fw-bold h5 mb-0 text-warning">{branchData.stats.lowStockCount}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold">STAFF USERS</span>
                                            <span className="fw-bold h5 mb-0">{branchData.stats.users?.staff}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold">ADMIN USERS</span>
                                            <span className="fw-bold h5 mb-0">{branchData.stats.users?.admin}</span>
                                        </div>
                                    </Col>
                                </Row>

                                {/* 3. CHARTS */}
                                <Row className="mb-4 g-4">
                                    <Col md={8}>
                                        <SalesChart data={branchData.charts?.salesData} title="Branch Sales Performance" />
                                    </Col>
                                    <Col md={4}>
                                        <PaymentChart data={branchData.charts?.paymentData} title="Payment Distribution" />
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
                                                    {branchData.recentInvoices.map((inv, i) => (
                                                        <tr key={i}>
                                                            <td>{inv.invoiceNumber}</td>
                                                            <td>{new Date(inv.date).toLocaleDateString()}</td>
                                                            <td className="text-truncate" style={{maxWidth: '100px'}}>{inv.customerName}</td>
                                                            <td className="fw-bold">{formatMoney(inv.total)}</td>
                                                        </tr>
                                                    ))}
                                                    {branchData.recentInvoices.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
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
                                                    {branchData.topProducts.map((p, i) => (
                                                        <tr key={i}>
                                                            <td className="text-truncate" style={{maxWidth: '120px'}}>{p.name}</td>
                                                            <td>{formatMoney(p.price)}</td>
                                                            <td>{p.stock}</td>
                                                            <td className="fw-bold text-success">{p.sold || 0}</td>
                                                        </tr>
                                                    ))}
                                                    {branchData.topProducts.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
                                                </tbody>
                                            </Table>
                                        </Card>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                             <div className="text-center py-5 text-muted">
                                 Select a branch to view details.
                             </div>
                        )}
                    </div>
                )}

                {/* --- TAB: ACTIVITY LOGS --- */}
                {activeTab === 'logs' && (
                    <div className="animation-fade-in">
                        <ActivityLogTable 
                            contextToken={localStorage.getItem('token')} 
                            isSuperAdmin={false} 
                        />
                    </div>
                )}
            </Container>
        </div>
    );
};

export default ClientDashboard;
