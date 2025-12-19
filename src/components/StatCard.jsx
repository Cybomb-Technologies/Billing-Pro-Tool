import React from 'react';
import { Card, ProgressBar } from 'react-bootstrap';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary', 
  subtitle, 
  trend, 
  onClick,
  progress // Optional: 0-100
}) => {
  const isPositiveTrend = trend >= 0;
  
  return (
    <Card 
      className={`h-100 stat-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ 
        border: 'none',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-surface)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        overflow: 'hidden'
      }}
    >
      <Card.Body className="">
        {/* Header: Icon and Trend */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          {/* Icon Container */}
          <div 
            className="rounded-2 p-2 d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: `var(--${color}-light)`,
              color: `var(--${color}-color)`,
              width: '56px',
              height: '56px'
            }}
          >
            {Icon && <Icon size={28} />}
          </div>
          
          {/* Trend Badge */}
          {trend !== undefined && trend !== null && (
            <div className="d-flex align-items-center">
              {isPositiveTrend ? (
                <TrendingUp size={16} className="me-1" color="var(--success-color)" />
              ) : (
                <TrendingDown size={16} className="me-1" color="var(--danger-color)" />
              )}
              <span 
                className="small fw-semibold"
                style={{
                  color: isPositiveTrend ? 'var(--success-color)' : 'var(--danger-color)',
                  fontSize: '13px'
                }}
              >
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <h3 
          className="fw-bold mb-2" 
          style={{
            color: 'var(--text-primary)',
            fontSize: '28px',
            lineHeight: 1.2
          }}
        >
          {value}
        </h3>

        {/* Title */}
        <p 
          className="mb-3" 
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            opacity: 0.8
          }}
        >
          {title}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p 
            className="mb-0 small"
            style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              opacity: 0.7
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span 
                className="small"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '12px'
                }}
              >
                Progress
              </span>
              <span 
                className="small fw-semibold"
                style={{
                  color: `var(--${color}-color)`,
                  fontSize: '13px'
                }}
              >
                {progress}%
              </span>
            </div>
            <div 
              className="rounded-pill"
              style={{
                height: '6px',
                backgroundColor: 'var(--bg-body)',
                overflow: 'hidden'
              }}
            >
              <div 
                className="h-100 rounded-pill"
                style={{
                  width: `${progress}%`,
                  backgroundColor: `var(--${color}-color)`,
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>
        )}
      </Card.Body>

      {/* Hover Effect */}
      {onClick && (
        <div 
          className="position-absolute bottom-0 start-0 w-100"
          style={{
            height: '3px',
            backgroundColor: `var(--${color}-color)`,
            transform: 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.3s ease'
          }}
        />
      )}

      {/* Hover Styles */}
      <style jsx>{`
        .stat-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04) !important;
          cursor: pointer;
        }
        
        .stat-card.clickable:hover > div:last-child {
          transform: scaleX(1);
        }
        
        /* Simple animation for progress bar fill */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .stat-card {
          animation: fadeIn 0.4s ease forwards;
        }
      `}</style>
    </Card>
  );
};

export default StatCard;