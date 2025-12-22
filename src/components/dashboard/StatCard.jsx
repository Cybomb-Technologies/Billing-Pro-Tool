import React from 'react';
import { Card } from 'react-bootstrap';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
    <Card className={`border-0 shadow-sm h-100 border-start border-4 border-${color}`}>
        <Card.Body>
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.7rem'}}>{title}</small>
                    <h4 className={`mb-0 fw-bold mt-1 text-${color}`}>{value}</h4>
                </div>
                <div className={`p-2 rounded bg-${color} bg-opacity-10 text-${color}`}>
                    <Icon size={18} />
                </div>
            </div>
            {subtext && <small className="text-muted small">{subtext}</small>}
            {trend !== undefined && (
                 <div className="mt-2 d-flex align-items-center small">
                    {trend >= 0 ? <TrendingUp size={14} className="text-success me-1"/> : <TrendingDown size={14} className="text-danger me-1"/>}
                    <span className={trend >= 0 ? "text-success fw-bold" : "text-danger fw-bold"}>{Math.abs(trend)}%</span>
                    <span className="text-muted ms-1">vs last period</span>
                 </div>
            )}
        </Card.Body>
    </Card>
);
