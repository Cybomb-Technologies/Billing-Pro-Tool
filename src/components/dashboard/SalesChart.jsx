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
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(13, 110, 253, 0.9)');
        gradient.addColorStop(1, 'rgba(13, 110, 253, 0.1)');

        setChartData({
            labels: hasData ? data.map(d => d.name) : [],
            datasets: [{
                label: 'Revenue',
                data: hasData ? data.map(d => d.amount) : [],
                backgroundColor: gradient,
                hoverBackgroundColor: '#0a58ca',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        });
    }, [data, hasData]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#111827',
                bodyColor: '#4b5563',
                titleFont: { size: 13, weight: 'bold', family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
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
                    color: '#f3f4f6', 
                    drawBorder: false,
                    drawTicks: false
                },
                ticks: { 
                    font: { size: 11, family: "'Inter', sans-serif" }, 
                    color: '#6b7280',
                    padding: 8,
                    callback: function(value) {
                         if (value >= 1000000) return '₹' + (value/1000000).toFixed(1) + 'M';
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
                    color: '#6b7280',
                    padding: 8
                },
                border: { display: false }
            } 
        },
        layout: { 
            padding: { 
                top: 16, 
                bottom: 16, 
                left: 12, 
                right: 12 
            } 
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center px-4">
                <h6 className="mb-0 fw-bold d-flex align-items-center text-dark">
                    <TrendingUp size={18} className="me-2 text-primary"/>
                    {title}
                </h6>
                <Form.Select 
                    size="sm" 
                    style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
                    value={filter}
                    onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
                    className="border-0 bg-light-subtle fw-medium text-dark-emphasis cursor-pointer shadow-sm"
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </Form.Select>
            </Card.Header>
            <Card.Body className="p-4">
                <div style={{ height: '320px', width: '100%' }}>
                     {hasData ? (
                        <Bar ref={chartRef} data={chartData} options={options} />
                     ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-4">
                            <BarChart2 size={48} className="mb-3 opacity-25" />
                            <p className="small mb-0 fw-medium text-center">No sales data found for this period</p>
                            <p className="x-small text-muted mt-1 text-center">Try selecting a different time period</p>
                        </div>
                     )}
                </div>
            </Card.Body>
        </Card>
    );
};