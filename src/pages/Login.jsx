import React, { useState } from 'react';
import { 
  Form, Button, Card, Container, Row, Col, Alert, 
  Spinner, InputGroup 
} from 'react-bootstrap';
// FIX: Changed '../context/AuthContext' to './context/AuthContext' 
// assuming the context file is now relative to the current component's parent directory.
// If this still fails, the path needs to be adjusted based on your exact file structure.
import { useAuth } from '../context/AuthContext'; 
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, GitBranch, ShieldCheck } from 'lucide-react'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', tenantId: '' });
  const [loginType, setLoginType] = useState('user'); // 'user' (Tenant/Staff) or 'client-admin' (Org Owner)
  const [showTenantId, setShowTenantId] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, loginClientAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (loginType === 'client-admin') {
          result = await loginClientAdmin(formData.email, formData.password);
          if (result.success) {
             navigate('/client-dashboard');
             return;
          }
      } else {
          result = await login(formData.email, formData.password, formData.tenantId);
          if (result.success) {
            navigate('/dashboard');
            return;
          }
      }

      setError(result.message || 'Login failed. Please check your credentials.');
    } catch (err) {
      setError('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Custom back button function
  const handleGoHome = () => {
      navigate('/');
  };

  // --- UI RENDER ---
  return (
    <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
    }}>
      <Container style={{ maxWidth: '900px' }}>
        <Card className="border-0 shadow-lg overflow-hidden" style={{ borderRadius: '20px' }}>
          <Row className="g-0">
            
            {/* Left Side - Brand / Visual */}
            <Col md={6} className="text-white d-none d-md-flex flex-column align-items-center justify-content-center p-5"
                 style={{ 
                    background: 'url("https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80") center/cover no-repeat',
                    position: 'relative'
                 }}>
              {/* Overlay */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(30, 60, 114, 0.85)' }}></div>
              
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div className="mb-4 bg-white text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: '80px', height: '80px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                    <ShieldCheck size={40} />
                </div>
                <h2 className="fw-bold mb-2">Billing Professional</h2>
                <p className="opacity-75">Empowering your business with seamless invoicing and management.</p>
              </div>
            </Col>

            {/* Right Side - Login Form */}
            <Col md={6} className="bg-white p-5">
              <div className="text-center mb-4">
                <h4 className="fw-bold text-dark">{loginType === 'client-admin' ? 'Organization Access' : 'Staff Portal'}</h4>
                <p className="text-muted small">
                    {loginType === 'client-admin' ? 'Login to manage your branches and subscription' : 'Login to your assigned branch dashboard'}
                </p>
              </div>

              {error && <Alert variant="danger" className="small border-0 shadow-sm" dismissible onClose={() => setError('')}>{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                
                <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-uppercase text-secondary">Email Address</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0"><Mail size={16} className="text-muted" /></InputGroup.Text>
                        <Form.Control
                            type="email"
                            name="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="bg-light border-start-0 ps-0"
                        />
                    </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-uppercase text-secondary">Password</Form.Label>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0"><Lock size={16} className="text-muted" /></InputGroup.Text>
                        <Form.Control
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="bg-light border-start-0 border-end-0 ps-0"
                        />
                         <InputGroup.Text 
                            className="bg-light border-start-0 cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{cursor: 'pointer'}}
                        >
                            <span className="small fw-bold text-muted" style={{fontSize: '0.7rem'}}>{showPassword ? 'HIDE' : 'SHOW'}</span>
                        </InputGroup.Text>
                    </InputGroup>
                </Form.Group>

                {/* Branch ID (Staff Only) - Moved Below Password */}
                {loginType === 'user' && (
                    <div className="mb-4">
                        <Form.Check 
                            type="checkbox"
                            id="show-branch-id"
                            label="Login to a specific Branch?"
                            className="small text-muted mb-2"
                            checked={showTenantId}
                            onChange={(e) => setShowTenantId(e.target.checked)}
                        />
                        
                        {showTenantId && (
                            <Form.Group className="mt-2 animation-fade-in">
                                <Form.Label className="small fw-bold text-uppercase text-secondary">Branch / Store ID</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-end-0"><GitBranch size={16} className="text-muted" /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        name="tenantId"
                                        placeholder="Enter Branch Slug"
                                        value={formData.tenantId}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className="bg-light border-start-0 ps-0"
                                    />
                                </InputGroup>
                            </Form.Group>
                        )}
                    </div>
                )}

                <Button 
                    variant={loginType === 'client-admin' ? 'dark' : 'primary'} 
                    type="submit" 
                    className="w-100 py-2 fw-semibold shadow-sm mb-4"
                    disabled={loading}
                    style={{ background: loginType === 'client-admin' ? '#2c3e50' : '#4a90e2', border: 'none' }}
                >
                    {loading ? <Spinner size="sm" animation="border" /> : (loginType === 'client-admin' ? 'Login as Multi-Branch Owner' : 'Login to Dashboard')}
                </Button>

                {/* Toggle Login Type */}
                <div className="text-center pt-3 border-top">
                    <p className="text-muted small mb-2">
                        {loginType === 'user' ? 'Are you a Multi-Branch Owner?' : 'Are you a Staff Member?'}
                    </p>
                    <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="rounded-pill px-4"
                        onClick={() => { 
                            setLoginType(loginType === 'user' ? 'client-admin' : 'user'); 
                            setError(''); 
                        }}
                    >
                        {loginType === 'user' ? 'Switch to Owner Login' : 'Switch to Staff Login'}
                    </Button>
                </div>

              </Form>
            </Col>
          </Row>
        </Card>
        
        {/* Footer Links */}
        <div className="text-center mt-4 text-white-50 small">
            <span className="cursor-pointer hover-text-white" onClick={handleGoHome}>Home</span> • 
            <span className="mx-2 cursor-pointer hover-text-white">Privacy Policy</span> • 
            <span className="cursor-pointer hover-text-white">Help Center</span>
        </div>
      </Container>
    </div>
  );
};

export default Login;
