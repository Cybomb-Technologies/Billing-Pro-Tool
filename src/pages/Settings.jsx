import React, { useEffect, useState } from "react";
import { Tab, Nav, Row, Col, Card, Form, Button, Table, Alert, Spinner, InputGroup } from "react-bootstrap";
import axios from "axios";
import { 
    Briefcase, DollarSign, Users, Trash, UserPlus, Save, 
    Landmark, Globe, CreditCard, UploadCloud // Added UploadCloud icon
} from 'lucide-react';

// Base URL for all settings API calls (assuming a centralized settings route)
const SETTINGS_API_BASE_URL = "http://localhost:5000/api/settings";
const UPLOAD_API_BASE_URL = "http://localhost:5000/api/upload/logo"; // Conceptual endpoint for file upload
const USERS_API_BASE_URL = "http://localhost:5000/api/users";

const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', 'name': 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
];

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const Settings = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "staff" });
  
  // New state to hold the selected file before upload
  const [selectedFile, setSelectedFile] = useState(null); 
  
  // State for Settings Tabs
  const [company, setCompany] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    address: "", 
    logo: "", // This will store the final file path/URL returned from the server
    branchLocation: "", 
    gstIn: "", 
    currency: "INR" 
  });
  
  const [payment, setPayment] = useState({ 
    bankName: "State Bank of India", 
    accountNumber: "", 
    ifsc: "", 
    paypalEmail: "",
    beneficiaryName: "",
    upiId: "",
    swiftCode: "",
    terms: "Payment due within 30 days."
  });

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // New state for upload status
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  // --- Core API Fetching Functions ---

  const fetchUsers = async () => {
    try {
      const res = await axios.get(USERS_API_BASE_URL, { headers: getAuthHeaders() });
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
        const res = await axios.get(SETTINGS_API_BASE_URL, { headers: getAuthHeaders() });
        const data = res.data;

        // Apply fetched data
        if (data.company) setCompany(prev => ({ 
            ...prev, 
            ...data.company,
            logo: data.company.logo || '', // Fetch the stored logo path
            branchLocation: data.company.branchLocation || '',
            gstIn: data.company.gstIn || '',
            currency: data.company.currency || 'INR',
        }));
        
        if (data.payment) setPayment(prev => ({ 
            ...prev, 
            ...data.payment,
            beneficiaryName: data.payment.beneficiaryName || '',
            upiId: data.payment.upiId || '',
            swiftCode: data.payment.swiftCode || '',
            terms: data.payment.terms || 'Payment due within 30 days.',
        }));

    } catch (error) {
        console.error("Error fetching settings:", error);
        showAlert('Failed to load saved settings.', 'danger');
    } finally {
        setLoading(false);
    }
  };
  
  // --- New File Upload Handler ---
  const handleFileUpload = async () => {
      if (!selectedFile) {
          showAlert('Please select a file to upload.', 'warning');
          return;
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', selectedFile); // Key 'logo' must match backend expectation

      try {
          const res = await axios.post(UPLOAD_API_BASE_URL, formData, {
              headers: { 
                  ...getAuthHeaders(), 
                  'Content-Type': 'multipart/form-data' // Important for file uploads
              }
          });

          // ASSUMPTION: Backend returns the URL/path of the saved file
          const logoPath = res.data.logoUrl || res.data.path;

          // 1. Update the local state with the new path
          setCompany(prev => ({ ...prev, logo: logoPath }));
          // 2. Clear the file input state
          setSelectedFile(null);
          
          showAlert('Logo uploaded successfully! Click "Save Company Info" to finalize.', 'success');
          
      } catch (error) {
          console.error("Error uploading logo:", error.response?.data || error);
          showAlert(`Logo upload failed: ${error.response?.data?.message || 'Check server logs.'}`, 'danger');
      } finally {
          setIsUploading(false);
      }
  };

  // --- User Management Functions ---

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(USERS_API_BASE_URL, form, { headers: getAuthHeaders() });
      setForm({ username: "", email: "", password: "", role: "staff" });
      fetchUsers();
      showAlert('New user added successfully!', 'success');
    } catch (error) {
      console.error("Error adding user:", error.response?.data || error);
      showAlert(`Error adding user: ${error.response?.data?.message || 'Check server logs.'}`, 'danger');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await axios.delete(`${USERS_API_BASE_URL}/${id}`, { headers: getAuthHeaders() });
      fetchUsers();
      showAlert('User deleted successfully.', 'success');
    } catch (error) {
      console.error("Error deleting user:", error.response?.data || error);
      showAlert('Error deleting user.', 'danger');
    }
  };

  // --- Generic Save Function (Saves the path/URL currently in state) ---

  const handleSave = async (e, category, dataToSave) => {
    e.preventDefault();
    try {
        await axios.patch(`${SETTINGS_API_BASE_URL}/${category}`, dataToSave, { headers: getAuthHeaders() });
        showAlert(`${category} settings saved successfully!`, 'success');
    } catch (error) {
        console.error(`Error saving ${category} settings:`, error);
        showAlert(`Failed to save ${category} settings.`, 'danger');
    }
  };

  return (
    <div className="p-4 d-flex flex-column min-vh-100">
      {alert.show && (
        <Alert variant={alert.type} className="position-fixed top-0 end-0 m-3" style={{ zIndex: 1050 }} onClose={() => setAlert({ show: false, message: '', type: '' })} dismissible>
          {alert.message}
        </Alert>
      )}
      
      <h2 className="mb-4">Settings</h2>
      
      <div className="flex-grow-1"> {/* Content Wrapper */}
        {loading ? (
          <div className="text-center py-5">
              <Spinner animation="border" className="me-2" /> Loading settings...
          </div>
        ) : (
          <Tab.Container defaultActiveKey="company">
            <Row>
              <Col sm={3}>
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey="company"><Briefcase size={18} className="me-2" /> Company Info</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="payment"><DollarSign size={18} className="me-2" /> Payment Settings</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="users"><Users size={18} className="me-2" /> Manage Users</Nav.Link>
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
                                    <img src={`http://localhost:5000${company.logo}`} alt="Company Logo Preview" style={{ maxWidth: '150px', maxHeight: '50px', border: '1px solid #ddd', padding: '5px' }} />
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
                            <Form.Control as="textarea" rows={2} value={payment.terms} onChange={(e) => setPayment({ ...payment, terms: e.target.value })} placeholder="e.g., Payment is due within 30 days of the invoice date." />
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