import React, { useEffect, useState } from "react";
import { Tab, Nav, Row, Col, Card, Form, Button, Table, Alert, Spinner, InputGroup } from "react-bootstrap";
import axios from "axios";
import { API_BASE_URL, SERVER_URL } from '../config';
import { 
    Briefcase, DollarSign, Users, Trash, UserPlus, Save, 
    Landmark, Globe, CreditCard, UploadCloud, Moon, Sun, Monitor 
} from 'lucide-react';

// ... (existing constants)

const Settings = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "staff" });
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- STATES ---
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({
    name: "", gstIn: "", email: "", phone: "", 
    address: "", branchLocation: "", currency: "INR", logo: ""
  });
  const [payment, setPayment] = useState({
    beneficiaryName: "", bankName: "", accountNumber: "", 
    ifsc: "", upiId: "", paypalEmail: "", terms: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Currencies
  const CURRENCIES = [
    { code: "INR", name: "Indian Rupee (₹)" },
    { code: "USD", name: "US Dollar ($)" },
    { code: "EUR", name: "Euro (€)" },
    { code: "GBP", name: "British Pound (£)" },
    { code: "AUD", name: "Australian Dollar (A$)" },
    { code: "CAD", name: "Canadian Dollar (C$)" }
  ];

  // --- FETCH SETTINGS ---
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await axios.get(`${API_BASE_URL}/settings`, { headers });
      if (res.data) {
        if (res.data.company) setCompany(prev => ({ ...prev, ...res.data.company }));
        if (res.data.payment) setPayment(prev => ({ ...prev, ...res.data.payment }));
      }
      
      // Fetch users
      const usersRes = await axios.get(`${API_BASE_URL}/users`, { headers });
      setUsers(usersRes.data);
      
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Optional: setAlert({ type: 'danger', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // --- HANDLERS ---
  const handleSave = async (e, type, data) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      // UPDATED: Use PATCH and specific route /api/settings/:category
      await axios.patch(`${API_BASE_URL}/settings/${type}`, data, { headers });
      alert(`${type === 'company' ? 'Company Info' : 'Payment Settings'} saved successfully!`);
      // Update global context if needed? For now just local.
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', selectedFile);
    try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_BASE_URL}/upload/logo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
            }
        });
        setCompany(prev => ({ ...prev, logo: res.data.logoPath }));
        alert('Logo uploaded successfully!');
    } catch (error) {
        console.error('Logo upload failed:', error);
        alert('Failed to upload logo.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_BASE_URL}/users`, form, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert('User added successfully');
        setForm({ username: "", email: "", password: "", role: "staff" });
        fetchSettings(); // Refresh list
    } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (id) => {
      if(!window.confirm("Are you sure?")) return;
      try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/users/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setUsers(users.filter(u => u._id !== id));
      } catch (error) {
          console.error(error);
          alert('Failed to delete user');
      }
  };

  return (
    <div className="p-4 d-flex flex-column min-vh-100">
      {/* ... (existing alert) */}
      
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">Settings</h2>
        <Button 
            variant={darkMode ? "outline-light" : "outline-dark"}
            onClick={() => setDarkMode(!darkMode)}
            className="d-flex align-items-center"
        >
            {darkMode ? <Sun size={18} className="me-2" /> : <Moon size={18} className="me-2" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>
      
      <div className="flex-grow-1"> {/* Content Wrapper */}
        {loading ? (
          <div className="text-center py-5">
              <Spinner animation="border" className="me-2" /> Loading settings...
          </div>
        ) : (
          <Tab.Container defaultActiveKey="company">
            <Row>
              <Col sm={3}>
                <Nav variant="pills" className="flex-column gap-1">
                  <Nav.Item>
                    <Nav.Link eventKey="company" className="d-flex align-items-center"><Briefcase size={18} className="me-2" /> Company Info</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="payment" className="d-flex align-items-center"><DollarSign size={18} className="me-2" /> Payment Settings</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="users" className="d-flex align-items-center"><Users size={18} className="me-2" /> Manage Users</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>
              <Col sm={9}>
                <Tab.Content>
                  {/* --------------------- Company Info --------------------- */}
                  <Tab.Pane eventKey="company">
                    <Card className="shadow-sm border-0">
                      <Card.Header className="bg-white"><h5>Company Info</h5></Card.Header>
                      <Card.Body>
                        <Form onSubmit={(e) => handleSave(e, 'company', company)}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Company Name *</Form.Label>
                                <Form.Control value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} required />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>GST-IN (Tax ID)</Form.Label>
                                <Form.Control value={company.gstIn} onChange={(e) => setCompany({ ...company, gstIn: e.target.value })} placeholder="e.g., 22AAAAA0000A1Z5" />
                              </Form.Group>
                            </Col>
                          </Row>

                          {/* START LOGO UPLOAD SECTION */}
                          <Form.Group className="mb-3">
                            <Form.Label>Company Logo (JPG/PNG)</Form.Label>
                            {/* Logo Preview */}
                            {company.logo && (
                                <div className="mb-2">
                                    <p className="text-muted small mb-1">Current Logo Path: `{company.logo}`</p>
                                    {/* Attempt to display image from path/URL */}
                                    <img src={`${SERVER_URL}${company.logo}`} alt="Company Logo Preview" style={{ maxWidth: '150px', maxHeight: '50px', border: '1px solid #ddd', padding: '5px' }} />
                                </div>
                            )}

                            <InputGroup>
                                <Form.Control
                                    type="file"
                                    accept=".jpg,.jpeg,.png"
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                />
                                <Button 
                                    variant="outline-primary" 
                                    onClick={handleFileUpload} 
                                    disabled={!selectedFile || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" /> Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={18} className="me-1" /> Upload File
                                        </>
                                    )}
                                </Button>
                            </InputGroup>
                            <Form.Text className="text-danger">
                                IMPORTANT: Click 'Upload File' after selection, then click 'Save Company Info'.
                            </Form.Text>
                          </Form.Group>
                          {/* END LOGO UPLOAD SECTION */}

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Phone</Form.Label>
                                <Form.Control value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Branch/Location</Form.Label>
                                  <Form.Control value={company.branchLocation} onChange={(e) => setCompany({ ...company, branchLocation: e.target.value })} placeholder="e.g., Chennai Branch" />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label><Globe size={16} className="me-1" /> Primary Currency</Form.Label>
                                  <Form.Select value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
                                      {CURRENCIES.map(c => (
                                          <option key={c.code} value={c.code}>{c.name}</option>
                                      ))}
                                  </Form.Select>
                                </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-4">
                            <Form.Label>Full Address</Form.Label>
                            <Form.Control as="textarea" rows={3} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
                          </Form.Group>
                          
                          <Button type="submit" variant="success">
                              <Save size={18} className="me-2" /> Save Company Info
                          </Button>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Tab.Pane>

                  {/* --------------------- Payment Settings --------------------- */}
                  <Tab.Pane eventKey="payment">
                    <Card className="shadow-sm border-0">
                      <Card.Header className="bg-white"><h5>Payment Settings</h5></Card.Header>
                      <Card.Body>
                        <Form onSubmit={(e) => handleSave(e, 'payment', payment)}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label><Landmark size={16} className="me-1" /> Beneficiary Name *</Form.Label>
                                <Form.Control value={payment.beneficiaryName} onChange={(e) => setPayment({ ...payment, beneficiaryName: e.target.value })} placeholder="Account Holder Name" required />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Bank Name</Form.Label>
                                <Form.Control value={payment.bankName} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} placeholder="e.g., State Bank of India" />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Account Number *</Form.Label>
                                <Form.Control value={payment.accountNumber} onChange={(e) => setPayment({ ...payment, accountNumber: e.target.value })} placeholder="1234567890" required />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>IFSC / Swift Code</Form.Label>
                                <Form.Control value={payment.ifsc} onChange={(e) => setPayment({ ...payment.ifsc, ifsc: e.target.value })} placeholder="e.g., SBIN0001234 (IFSC) or CHASUS33 (SWIFT)" />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>UPI ID</Form.Label>
                                <Form.Control value={payment.upiId} onChange={(e) => setPayment({ ...payment, upiId: e.target.value })} placeholder="e.g., yourname@upi" />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>PayPal Email/ID</Form.Label>
                                <Form.Control type="email" value={payment.paypalEmail} onChange={(e) => setPayment({ ...payment, paypalEmail: e.target.value })} placeholder="paypal@example.com" />
                              </Form.Group>
                            </Col>
                          </Row>
                          
                          <Form.Group className="mb-4">
                            <Form.Label>Standard Payment Terms</Form.Label>
                            <Form.Control as="textarea" rows={2} value={payment.terms} onChange={(e) => setPayment({ ...payment, terms: e.target.value })} placeholder="Enter payment terms (optional)..." />
                            <Form.Text className="text-muted">These terms will appear at the bottom of all generated invoices.</Form.Text>
                          </Form.Group>

                          <Button type="submit" variant="success">
                              <Save size={18} className="me-2" /> Save Payment Settings
                          </Button>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Tab.Pane>

                  {/* --------------------- Users Management --------------------- */}
                  <Tab.Pane eventKey="users">
                    <Card className="shadow-sm border-0">
                      <Card.Header className="bg-white"><h5>Manage Users</h5></Card.Header>
                      <Card.Body>
                        <Form onSubmit={handleAddUser} className="row g-3 mb-4">
                          <div className="col-md-3">
                            <Form.Control placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                          </div>
                          <div className="col-md-3">
                            <Form.Control type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                          </div>
                          <div className="col-md-2">
                            <Form.Control type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                          </div>
                          <div className="col-md-2">
                            <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </Form.Select>
                          </div>
                          <div className="col-md-2">
                            <Button type="submit" variant="success" className="w-100">
                              <UserPlus size={18} className="me-1" /> Add
                            </Button>
                          </div>
                        </Form>

                        <Table responsive hover>
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Joined</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u._id}>
                                <td>{u.username}</td>
                                <td>{u.email}</td>
                                <td><span className={`badge ${u.role === "admin" ? "bg-danger" : "bg-secondary"}`}>{u.role.toUpperCase()}</span></td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <Button variant="outline-danger" size="sm" onClick={() => handleDeleteUser(u._id)}>
                                      <Trash size={14} />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="mt-4 pt-3 border-top text-center text-muted small">
          Powered by **Cybomb Technologies**
      </div>
    </div>
  );
};

export default Settings;