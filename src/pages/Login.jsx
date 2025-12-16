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
import { Mail, Lock, LogIn } from 'lucide-react'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
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
      navigate('/home');
  };

  return (
    // Outer container for full-screen effect
    <div className="d-flex align-items-center justify-content-center" 
         style={{ minHeight: '100vh', background: 'linear-gradient(to right, #1a237e, #4a148c)' }}>
      
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} md={10} lg={8}>
            <Card className="shadow-lg border-0 rounded-3">
              <Row className="g-0">
                
                {/* Visual/Branding Section (Hidden on small screens) */}
                <Col md={6} className="d-none d-md-flex flex-column align-items-center justify-content-center p-5 text-white rounded-start-3" 
                     style={{ background: 'linear-gradient(to bottom, #4a148c, #1a237e)' }}>
                  <div className="text-center">
                    <h1 className="fw-bold mb-3">Billing Pro</h1>
                    <p className="lead">Seamless invoicing for your business growth.</p>
                    <LogIn size={64} className="mt-4" />
                    
                  </div>
                </Col>

                {/* Login Form Section */}
                <Col md={6} className="p-4 p-md-5">
                  <div className="text-center mb-4">
                    <h2 className="fw-bold text-primary">Sign In</h2>
                    <p className="text-muted">Access your Billing Dashboard</p>
                  </div>
                  
                  {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                  
                  <Form onSubmit={handleSubmit}>
                    
                    {/* Email Field with Icon */}
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Email Address</Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="rounded-start-2"><Mail size={16} /></InputGroup.Text>
                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="rounded-end-2"
                        />
                      </InputGroup>
                    </Form.Group>
                    
                    {/* Password Field with Icon */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">Password</Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="rounded-start-2"><Lock size={16} /></InputGroup.Text>
                        <Form.Control
                          type="password"
                          name="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="rounded-end-2"
                        />
                      </InputGroup>
                    </Form.Group>
                    
                    {/* Dynamic Button */}
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="w-100 fw-bold py-2 rounded-2" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Authenticating...
                        </>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </Form>
                  
                  {/* Footer Info */}
                  {/* <div className="text-center mt-4 pt-3 border-top">
                    <small className="text-muted">
                      Demo Credentials: <span className="fw-semibold">admin@billing.com</span> / <span className="fw-semibold">password</span>
                    </small>
                  </div> */}
                  <div className="text-center mt-3 d-md-none">
                      
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
