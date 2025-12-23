import React, { useRef, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card, Form } from 'react-bootstrap';
import { TrendingUp, BarChart2 } from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const SalesChart = ({ data, title = "Sales Trend", filter, onFilterChange }) => {
    const hasData = data && data.length > 0;
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState({ datasets: [] });

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const ctx = chart.ctx;
        // CREATE A RICHER GRADIENT
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#3b82f6'); // Start with a strong blue
        gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.4)'); // Fade out
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)'); // Almost transparent

        setChartData({
            labels: hasData ? data.map(d => d.name) : [],
            datasets: [{
                label: 'Revenue',
                data: hasData ? data.map(d => d.amount) : [],
                backgroundColor: gradient,
                hoverBackgroundColor: '#2563eb',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4, // Slightly sharper corners for modern look
                barPercentage: 0.5, // Slightly thinner bars
                categoryPercentage: 0.7,
                maxBarThickness: 32 // Prevent overly wide bars
            }]
        });
    }, [data, hasData]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                titleFont: { size: 13, weight: '600', family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                boxPadding: 4,
                callbacks: {
                    label: function(context) {
                        return ` Revenue: ₹${Number(context.parsed.y).toLocaleString('en-IN')}`;
                    }
                }
            }
        },
        scales: { 
            y: { 
                beginAtZero: true, 
                grid: { 
                    color: '#f1f5f9', 
                    drawBorder: false,
                    drawTicks: false,
                    borderDash: [5, 5] // Dashed grid lines
                },
                ticks: { 
                    font: { size: 11, family: "'Inter', sans-serif", weight: '500' }, 
                    color: '#94a3b8',
                    padding: 10,
                    cursor: 'default',
                    callback: function(value) {
                         if (value >= 10000000) return '₹' + (value/10000000).toFixed(1) + 'Cr';
                         if (value >= 100000) return '₹' + (value/100000).toFixed(1) + 'L';
                         if (value >= 1000) return '₹' + (value/1000).toFixed(0) + 'k';
                         return '₹' + value;
                    }
                },
                border: { display: false }
            }, 
            x: { 
                grid: { display: false },
                ticks: { 
                    font: { size: 11, family: "'Inter', sans-serif" }, 
                    color: '#94a3b8',
                    padding: 5,
                    maxRotation: 0,
                    autoSkip: true,
                    autoSkipPadding: 20
                },
                border: { display: false }
            } 
        },
        layout: { 
            padding: { 
                top: 10, 
                bottom: 5, 
                left: 0, 
                right: 0 
            } 
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <Card className="border-0 shadow-sm h-100 chart-card">
            <Card.Header className="bg-white py-3 border-bottom-0 d-flex justify-content-between align-items-center px-4 pt-4">
                <h6 className="mb-0 fw-bold d-flex align-items-center text-dark">
                    <div className="bg-primary bg-opacity-10 rounded p-2 me-2 doc-icon">
                        <TrendingUp size={18} className="text-primary"/>
                    </div>
                    {title}
                </h6>
                <Form.Select 
                    size="sm" 
                    style={{ width: 'auto', minWidth: '110px', fontSize: '0.8rem', borderRadius: '6px' }}
                    value={filter}
                    onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
                    className="border-light bg-light fw-medium text-secondary cursor-pointer shadow-sm"
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </Form.Select>
            </Card.Header>
            <Card.Body className="px-4 pb-4 pt-2">
                <div style={{ height: '320px', width: '100%' }}>
                     {hasData ? (
                        <Bar ref={chartRef} data={chartData} options={options} />
                     ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-4">
                            <div className="bg-light rounded-circle p-3 mb-3">
                                <BarChart2 size={32} className="opacity-50 text-secondary" />
                            </div>
                            <p className="small mb-0 fw-bold text-secondary">No sales activity yet</p>
                            <p className="x-small text-muted mt-1 text-center">Sales data will appear here once you create invoices</p>
                        </div>
                     )}
                </div>
            </Card.Body>
        </Card>
    );
};