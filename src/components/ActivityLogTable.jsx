import React, { useState, useEffect } from 'react';
import { Table, Form, InputGroup, Card, Badge, Spinner, Button, Row, Col, Container } from 'react-bootstrap';
import { Search, Clock, Shield, User, Filter, Calendar, X, ChevronLeft, ChevronRight, Activity, ArrowRight } from 'lucide-react';

export const ActivityLogTable = ({ 
    fetchUrl, 
    contextToken, 
    isSuperAdmin = false, 
    tenantSlug = '',
    organizations = [], // For SuperAdmin Filter
    tenants = [] // For SuperAdmin Filter
}) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filters
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // SuperAdmin Filters
    const [filterOrg, setFilterOrg] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 15, // Slightly lower limit for better scrolling
                ...(selectedModule && { module: selectedModule }),
                ...(selectedAction && { action: selectedAction }),
                ...(search && { search }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(tenantSlug && !isSuperAdmin && { slug: tenantSlug }), // For client side
                ...(isSuperAdmin && filterOrg && { organizationId: filterOrg }),
                ...(isSuperAdmin && filterBranch && { slug: filterBranch })
            });

            // Determine URL
            let url = fetchUrl;
            // If superadmin but no specific fetchUrl passed, rely on logic:
            if (isSuperAdmin) {
                 url = `${window.location.protocol}//${window.location.hostname}:5000/api/super-admin/activity-logs`;
            } else if (!fetchUrl) {
                 url = `${window.location.protocol}//${window.location.hostname}:5000/api/logs`;
            }

            const headers = isSuperAdmin 
                ? { 'x-admin-key': contextToken } 
                : { 'Authorization': `Bearer ${contextToken}` };

            const res = await fetch(`${url}?${params}`, { headers });
            const data = await res.json();
            
            if (res.ok) {
                setLogs(data.logs || []);
                setTotalPages(data.totalPages || 1);
            } else {
                console.error("Fetch failed", data);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchLogs(), 300); // Debounce search
        return () => clearTimeout(timer);
    }, [page, selectedModule, selectedAction, search, startDate, endDate, tenantSlug, filterOrg, filterBranch]);

    const clearFilters = () => {
        setSearch('');
        setSelectedModule('');
        setSelectedAction('');
        setStartDate('');
        setEndDate('');
        setFilterOrg('');
        setFilterBranch('');
        setPage(1);
    };

    // Derived State for Branch Filter
    const availableBranches = filterOrg 
        ? tenants.filter(t => (t.organizationId?._id === filterOrg || t.organizationId === filterOrg) && t.status === 'active')
        : [];

    const getActionBadge = (action) => {
        const styles = {
            'CREATE': { bg: 'success', icon: 'plus' },
            'UPDATE': { bg: 'primary', icon: 'edit' },
            'DELETE': { bg: 'danger', icon: 'trash' },
            'SOFT_DELETE': { bg: 'warning', text: 'dark', icon: 'trash-2' },
            'LOGIN': { bg: 'info', text: 'dark', icon: 'log-in' },
            'LOGOUT': { bg: 'secondary', icon: 'log-out' },
        };
        const style = styles[action] || { bg: 'light', text: 'dark' };
        
        return (
            <Badge bg={style.bg} text={style.text} className="px-2 py-1 fw-medium shadow-sm">
                {action}
            </Badge>
        );
    };

    return (
        <Container fluid className="p-0">
            {/* Filter Section */}
            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="bg-light p-4 border-bottom">
                    <Row className="gy-3 align-items-end">
                        <Col md={3}>
                            <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Search</Form.Label>
                            <InputGroup className="shadow-sm">
                                <InputGroup.Text className="bg-white border-end-0 text-muted"><Search size={16} /></InputGroup.Text>
                                <Form.Control 
                                    placeholder="Keywords, User, Desc..." 
                                    className="border-start-0 ps-0 form-control-lg fs-6"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </InputGroup>
                        </Col>

                        <Col md={isSuperAdmin ? 2 : 2}>
                             <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Module</Form.Label>
                             <Form.Select 
                                className="shadow-sm form-select-lg fs-6" 
                                value={selectedModule} 
                                onChange={e => setSelectedModule(e.target.value)}
                            >
                                <option value="">All Modules</option>
                                <option value="AUTH">Auth</option>
                                <option value="INVOICE">Invoices</option>
                                <option value="PRODUCT">Products</option>
                                <option value="ORGANIZATION">Organizations</option>
                                <option value="BRANCH">Branches</option>
                            </Form.Select>
                        </Col>

                        <Col md={2}>
                             <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Action</Form.Label>
                             <Form.Select 
                                className="shadow-sm form-select-lg fs-6" 
                                value={selectedAction} 
                                onChange={e => setSelectedAction(e.target.value)}
                            >
                                <option value="">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="LOGIN">Login</option>
                            </Form.Select>
                        </Col>

                        <Col md={isSuperAdmin ? 5 : 5}>
                            <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Date Range</Form.Label>
                            <InputGroup className="shadow-sm">
                                <Form.Control 
                                    type="date"
                                    className="form-control-lg fs-6 text-muted"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                                <InputGroup.Text className="bg-light border-start-0 border-end-0 text-muted small">to</InputGroup.Text>
                                <Form.Control 
                                    type="date"
                                    className="form-control-lg fs-6 text-muted"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                    </Row>
                    
                    {/* Super Admin Second Row */}
                    {isSuperAdmin && (
                        <Row className="mt-3 gy-3 align-items-end">
                             <Col md={4}>
                                <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Organization</Form.Label>
                                <Form.Select 
                                    className="shadow-sm form-select-lg fs-6"
                                    value={filterOrg} 
                                    onChange={e => { setFilterOrg(e.target.value); setFilterBranch(''); }}
                                >
                                    <option value="">All Organizations</option>
                                    {organizations.map(org => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
                                </Form.Select>
                             </Col>
                             <Col md={4}>
                                <Form.Label className="small text-muted fw-bold text-uppercase ls-1">Branch</Form.Label>
                                <Form.Select 
                                    className="shadow-sm form-select-lg fs-6"
                                    value={filterBranch} 
                                    onChange={e => setFilterBranch(e.target.value)}
                                    disabled={!filterOrg}
                                >
                                    <option value="">{filterOrg ? 'All Branches' : 'Select Org First'}</option>
                                    {availableBranches.map(b => (
                                        <option key={b.slug} value={b.slug}>{b.name}</option>
                                    ))}
                                </Form.Select>
                             </Col>
                             <Col md={4} className="d-flex justify-content-end">
                                 <Button 
                                    variant="outline-danger" 
                                    size="lg" 
                                    className="fs-6 d-flex align-items-center"
                                    onClick={clearFilters}
                                 >
                                    <X size={18} className="me-2" /> Clear Filters
                                 </Button>
                             </Col>
                        </Row>
                    )}
                    
                    {!isSuperAdmin && (
                        <Row className="mt-2">
                            <Col className="d-flex justify-content-end">
                                <Button 
                                    variant="link" 
                                    className="text-muted text-decoration-none d-flex align-items-center p-0 mt-2"
                                    onClick={clearFilters}
                                >
                                    <X size={16} className="me-1" /> Clear All Filters
                                </Button>
                            </Col>
                        </Row>
                    )}
                </div>

                {/* Table Section */}
                <div className="table-responsive">
                    <Table hover className="align-middle mb-0" style={{ minWidth: '800px' }}>
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="py-3 ps-4 text-muted small fw-bold text-uppercase" style={{width: '20%'}}>Timestamp</th>
                                {isSuperAdmin && <th className="py-3 text-muted small fw-bold text-uppercase">Context</th>}
                                <th className="py-3 text-muted small fw-bold text-uppercase text-center">Action</th>
                                <th className="py-3 text-muted small fw-bold text-uppercase">Module</th>
                                <th className="py-3 text-muted small fw-bold text-uppercase" style={{width: '30%'}}>Description</th>
                                <th className="py-3 text-muted small fw-bold text-uppercase">User</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-5">
                                        <div className="py-5">
                                            <Spinner animation="border" variant="primary" />
                                            <p className="mt-3 text-muted">Loading activity history...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-5">
                                        <div className="py-5 opacity-50">
                                            <Activity size={48} className="text-muted mb-3" />
                                            <h5>No activity found</h5>
                                            <p className="mb-0">Try adjusting your filters to see more results.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} style={{borderBottom: '1px solid #f0f0f0'}}>
                                        <td className="ps-4">
                                            <div className="d-flex flex-column">
                                                <span className="fw-medium text-dark">
                                                    {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                                <small className="text-muted">
                                                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </small>
                                            </div>
                                        </td>
                                        {isSuperAdmin && (
                                            <td>
                                                <div className="d-flex flex-column small">
                                                    <span className="fw-bold text-dark">{log.organizationName || '-'}</span>
                                                    <span className="text-muted">{log.tenantName || 'Global'}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="text-center">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border fw-normal px-2 py-1">
                                                {log.module}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-break" style={{maxWidth: '350px'}}>
                                                {log.description}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div 
                                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 shadow-sm"
                                                    style={{width: '32px', height: '32px', fontSize: '12px'}}
                                                >
                                                    {log.performedBy?.name ? log.performedBy.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div className="d-flex flex-column" style={{lineHeight: '1.2'}}>
                                                    <span className="small fw-bold">{log.performedBy?.name || 'Unknown'}</span>
                                                    <span className="small text-muted" style={{fontSize: '11px'}}>{log.performedBy?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Footer Pagination */}
                 <div className="card-footer bg-white py-3 border-top">
                    <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                            Showing page {page} of {totalPages}
                        </small>
                        <div className="btn-group shadow-sm">
                            <Button 
                                variant="outline-light" 
                                className="text-dark border" 
                                disabled={page === 1} 
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button variant="primary" disabled>{page}</Button>
                             <Button 
                                variant="outline-light" 
                                className="text-dark border"
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </Container>
    );
};
