import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Row,
  Col,
  Table,
  Modal,
  Form,
  Badge,
  Alert,
  InputGroup,
  Dropdown,
  Spinner,
} from "react-bootstrap";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Eye
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext"; // FIX: Adjusted import path

const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        headers: getAuthHeaders(),
      });
      // Handle both new paginated object and potential old array format ensuring backward compatibility during dev
      const customersData = response.data.customers || response.data || [];
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
      showAlert("Error fetching customers", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (!formData.name.trim()) {
        showAlert("Name is required", "warning");
        setSubmitting(false);
        return;
      }

      if (formData._id) {
        await axios.put(`${API_BASE_URL}/customers/${formData._id}`, formData, {
          headers: getAuthHeaders(),
        });
        showAlert("Customer updated successfully!", "success");
      } else {
        await axios.post(`${API_BASE_URL}/customers`, formData, {
          headers: getAuthHeaders(),
        });
        showAlert("Customer created successfully!", "success");
      }

      await fetchCustomers();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving customer:", error);
      const errorMessage =
        error.response?.data?.message || "Error saving customer";
      showAlert(errorMessage, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm("Are you sure you want to delete this customer?"))
      return;

    try {
      await axios.delete(`${API_BASE_URL}/customers/${customerId}`, {
        headers: getAuthHeaders(),
      });
      await fetchCustomers();
      showAlert("Customer deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting customer:", error);
      const errorMessage =
        error.response?.data?.message || "Error deleting customer";
      showAlert(errorMessage, "danger");
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowEditModal(false);
    setEditingCustomer(null);
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 4000);
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customers/export/csv`, {
        responseType: "blob",
        headers: getAuthHeaders(),
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "customers.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert("Customers exported successfully", "success");
    } catch (error) {
      console.error("Error exporting customers:", error);
      showAlert("Error exporting customers", "danger");
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.businessName?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.gstNumber?.toLowerCase().includes(searchLower)
    );
  });

  // --- Customer Modal with local state (Updated) ---
  const CustomerModal = ({ show, onHide, isEdit, initialData }) => {
    const [formData, setFormData] = useState({
      ...initialData,
      address: initialData.address || {},
    });

    useEffect(() => {
      setFormData({
        ...initialData,
        address: initialData.address || {},
      });
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      if (name.startsWith("address.")) {
        const field = name.split(".")[1];
        setFormData((prev) => ({
          ...prev,
          address: { ...prev.address, [field]: value },
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    };

    const handleSubmitWrapper = (e) => {
      e.preventDefault();
      if (isEdit) {
        handleSubmit({ ...formData, _id: initialData._id });
      } else {
        handleSubmit(formData);
      }
    };

    return (
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? "Edit Customer" : "Add Customer"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitWrapper}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Person Name *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <User size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={submitting}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Business/Organization Name</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <Building size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g., Acme Corp"
                      disabled={submitting}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <Phone size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <Mail size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>GST Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    disabled={submitting}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Card className="border mt-3">
              <Card.Header>
                <MapPin size={16} className="me-2" /> Address
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Street</Form.Label>
                  <Form.Control
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>ZIP</Form.Label>
                  <Form.Control
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={onHide} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Updating..."
                  : "Adding..."
                : isEdit
                ? "Update"
                : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    );
  };

  // --- View Customer Modal ---
  const ViewCustomerModal = ({ show, onHide, customer, invoices, loading }) => {
    if (!customer) return null;

    // Calculate stats
    const totalSpent = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalInvoices = invoices.length;
    const pendingAmount = invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return (
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
           {/* 1. Customer Summary Card */}
           <Card className="border-0 shadow-sm mb-4">
              <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                      <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                          <User size={24} className="text-primary" />
                      </div>
                      <div>
                          <h5 className="fw-bold mb-0">{customer.name}</h5>
                          <small className="text-muted">{customer.businessName || 'Individual Customer'}</small>
                      </div>
                  </div>
                  <Row className="g-3">
                      <Col md={6}>
                          <div className="d-flex align-items-center text-muted mb-1">
                              <Phone size={14} className="me-2" /> Phone
                          </div>
                          <div className="fw-medium">{customer.phone}</div>
                      </Col>
                       <Col md={6}>
                          <div className="d-flex align-items-center text-muted mb-1">
                              <Mail size={14} className="me-2" /> Email
                          </div>
                          <div className="fw-medium">{customer.email || 'N/A'}</div>
                      </Col>
                        <Col md={12}>
                          <div className="d-flex align-items-center text-muted mb-1">
                              <MapPin size={14} className="me-2" /> Address
                          </div>
                          <div className="fw-medium">
                              {[
                                  customer.address?.street, 
                                  customer.address?.city, 
                                  customer.address?.state, 
                                  customer.address?.zipCode
                                ].filter(Boolean).join(', ') || 'N/A'}
                          </div>
                      </Col>
                  </Row>
              </Card.Body>
           </Card>

           {/* 2. Stats Cards */}
           <Row className="mb-4 g-3">
               <Col md={4}>
                   <Card className="border-0 shadow-sm h-100 border-start border-4 border-success">
                       <Card.Body>
                           <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Total Spent</small>
                           <h4 className="fw-bold text-success mb-0">₹{totalSpent.toLocaleString()}</h4>
                       </Card.Body>
                   </Card>
               </Col>
               <Col md={4}>
                   <Card className="border-0 shadow-sm h-100 border-start border-4 border-primary">
                       <Card.Body>
                           <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Total Invoices</small>
                           <h4 className="fw-bold text-primary mb-0">{totalInvoices}</h4>
                       </Card.Body>
                   </Card>
               </Col>
                <Col md={4}>
                   <Card className="border-0 shadow-sm h-100 border-start border-4 border-warning">
                       <Card.Body>
                           <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Pending Due</small>
                           <h4 className="fw-bold text-warning mb-0">₹{pendingAmount.toLocaleString()}</h4>
                       </Card.Body>
                   </Card>
               </Col>
           </Row>

           {/* 3. Invoices List */}
           <h6 className="fw-bold mb-3">Transaction History</h6>
           <Card className="border-0 shadow-sm">
               <Card.Body className="p-0">
                   {loading ? (
                       <div className="text-center py-5"><Spinner size="sm" /> Loading history...</div>
                   ) : (
                       <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}>
                           <Table hover className="mb-0 align-middle table-borderless">
                               <thead className="bg-light sticky-top">
                                   <tr>
                                       <th className="ps-4">Invoice #</th>
                                       <th>Date</th>
                                       <th>Status</th>
                                       <th className="text-end pe-4">Amount</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {invoices.map(inv => (
                                       <tr key={inv._id} className="border-bottom">
                                           <td className="ps-4 fw-medium text-primary">#{inv.invoiceNumber}</td>
                                           <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                           <td>
                                               <Badge bg={
                                                   inv.status === 'paid' ? 'success' : 
                                                   inv.status === 'pending' ? 'warning' : 'danger'
                                               }>
                                                   {inv.status}
                                               </Badge>
                                           </td>
                                           <td className="text-end pe-4 fw-bold">₹{inv.total?.toLocaleString()}</td>
                                       </tr>
                                   ))}
                                   {invoices.length === 0 && (
                                       <tr>
                                           <td colSpan="4" className="text-center py-4 text-muted">No invoices found for this customer.</td>
                                       </tr>
                                   )}
                               </tbody>
                           </Table>
                       </div>
                   )}
               </Card.Body>
           </Card>

        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const [viewCustomer, setViewCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [viewModalShow, setViewModalShow] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const handleViewCustomer = async (customer) => {
      setViewCustomer(customer);
      setViewModalShow(true);
      setViewLoading(true);
      setCustomerInvoices([]); // Reset first

      try {
          // Fetch all invoices for this customer
          const response = await axios.get(`${API_BASE_URL}/invoices`, {
              params: { customer: customer._id, limit: 100 }, // Fetch up to 100 recent invoices
              headers: getAuthHeaders()
          });
          setCustomerInvoices(response.data.invoices || []);
      } catch (error) {
          console.error("Error fetching customer invoices:", error);
          showAlert("Could not load customer history", "warning");
      } finally {
          setViewLoading(false);
      }
  };


  return (
    <div className="p-4 d-flex flex-column flex-grow-1">
      {alert.show && (
        <Alert
          variant={alert.type}
          dismissible
          onClose={() => setAlert({ show: false, message: "", type: "" })}
        >
          {alert.message}
        </Alert>
      )}

      <Row className="mb-4 align-items-center">
        <Col>
          <h2>Customers</h2>
          <p className="text-muted">Manage your customer relationships</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={handleExportCSV}>
            <Download size={18} className="me-2" /> Export CSV
          </Button>
          <Button
            variant="success"
            onClick={handleAddCustomer}
            className="ms-2"
          >
            <Plus size={18} className="me-2" /> Add Customer
          </Button>
        </Col>
      </Row>

      <Card className="flex-grow-1 d-flex flex-column shadow-sm border-0">
        <Card.Header className="bg-white py-3">
          <Row>
            <Col md={6}>
              <div className="position-relative">
                <Search
                  size={18}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />
                <Form.Control
                  type="text"
                  placeholder="Search by name, phone, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-5"
                />
              </div>
            </Col>
            <Col md={6} className="text-end">
              <Badge bg="light" text="dark">
                {filteredCustomers.length} customers
              </Badge>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0 flex-grow-1 d-flex flex-column">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" size="sm" /> Loading...
            </div>
          ) : (
            <div className="table-responsive flex-grow-1">
              <Table hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3">Contact Name</th>
                  <th className="py-3">Organization</th>
                  <th className="py-3">Phone / Email</th>
                  <th className="py-3">City</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td className="ps-4 py-3">
                      <div className="fw-semibold">{customer.name}</div>
                      {customer.gstNumber && (
                        <small className="text-muted">
                          GST: {customer.gstNumber}
                        </small>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="fw-bold">
                        {customer.businessName || "Individual"}
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{customer.phone}</div>
                      {customer.email && (
                        <small className="text-muted">{customer.email}</small>
                      )}
                    </td>
                    <td className="py-3">{customer.address?.city || "-"}</td>
                    <td className="py-3">
                      <Badge bg="success">Active</Badge>
                    </td>
                    <td className="py-3">
                      <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm">
                          <MoreVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleViewCustomer(customer)}>
                            <Eye size={16} className="me-2 text-primary" /> View Details
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit size={16} className="me-2" /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-danger"
                          >
                            <Trash2 size={16} className="me-2" /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No customers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modals */}
      <ViewCustomerModal 
          show={viewModalShow} 
          onHide={() => setViewModalShow(false)} 
          customer={viewCustomer}
          invoices={customerInvoices}
          loading={viewLoading}
      />
      
      <CustomerModal
        show={showModal}
        onHide={handleCloseModal}
        isEdit={false}
        initialData={{
          name: "",
          businessName: "", // NEW FIELD
          email: "",
          phone: "",
          address: { street: "", city: "", state: "", zipCode: "" },
          gstNumber: "",
        }}
      />
      {editingCustomer && (
        <CustomerModal
          show={showEditModal}
          onHide={handleCloseModal}
          isEdit={true}
          initialData={editingCustomer}
        />
      )}
    </div>
  );
};

export default Customers;
