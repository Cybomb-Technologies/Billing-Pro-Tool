import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Card, Form } from 'react-bootstrap';
import { CreditCard, PieChart } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export const PaymentChart = ({ data, title = "Payment Methods", filter, onFilterChange }) => {
    const hasData = data && data.length > 0;
    
    // Enhanced Color Palette for standard payment types
    const colorMap = {
        'CASH': '#10b981',        // Emerald 500
        'CARD': '#3b82f6',        // Blue 500
        'UPI': '#8b5cf6',         // Violet 500
        'BANK TRANSFER': '#f59e0b', // Amber 500
        'CHEQUE': '#06b6d4',      // Cyan 500
        'CHEQUES': '#06b6d4',     // Alternative spelling
        'OTHER': '#9ca3af',       // Gray 400
        'DEBIT CARD': '#2563eb',  // Blue 600
        'CREDIT CARD': '#1d4ed8', // Blue 700
        'NET BANKING': '#f97316', // Orange 500
        'WALLET': '#ec4899'       // Pink 500
    };

    // Process data to include all payment types from DB
    const processData = (rawData) => {
        if (!rawData || !Array.isArray(rawData)) return [];
        
        const processed = {};
        const defaultTypes = ['CASH', 'CARD', 'UPI', 'BANK TRANSFER', 'CHEQUE', 'OTHER'];
        
        // Initialize all payment types with 0
        defaultTypes.forEach(type => {
            processed[type] = 0;
        });

        // Sum values from raw data
        rawData.forEach(item => {
            if (item && item.name && item.value !== undefined) {
                const key = item.name.toUpperCase().trim();
                processed[key] = (processed[key] || 0) + Number(item.value);
            }
        });

        // Convert to array format
        return Object.entries(processed)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    };

    const processedData = processData(data);
    const displayData = processedData.length > 0 ? processedData : [];
    const hasDisplayData = displayData.length > 0;

    const bgColors = hasDisplayData ? displayData.map(d => {
        const key = d.name.toUpperCase();
        return colorMap[key] || colorMap['OTHER'];
    }) : [];

    const borderColors = hasDisplayData ? displayData.map(() => '#ffffff') : [];

    const chartData = {
        labels: hasDisplayData ? displayData.map(d => {
            // Format labels nicely
            const name = d.name.toLowerCase();
            return name.charAt(0).toUpperCase() + name.slice(1);
        }) : [],
        datasets: [{
            data: hasDisplayData ? displayData.map(d => d.value) : [],
            backgroundColor: bgColors,
            hoverBackgroundColor: bgColors.map(color => {
                // Darken color on hover
                return color.replace(/rgb\((\d+), (\d+), (\d+)\)/, (match, r, g, b) => {
                    return `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                });
            }),
            hoverOffset: 8,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { 
                position: 'right', 
                labels: { 
                    usePointStyle: true, 
                    pointStyle: 'circle',
                    boxWidth: 8,
                    padding: 16,
                    font: { 
                        size: 12, 
                        family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
                        weight: 500 
                    },
                    color: '#374151',
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                
                                return {
                                    text: `${label}: ${percentage}%`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].borderColor[i],
                                    lineWidth: data.datasets[0].borderWidth,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                } 
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#111827',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: { 
                    size: 13, 
                    weight: '600', 
                    family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
                },
                bodyFont: { 
                    size: 12, 
                    family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
                },
                displayColors: true,
                boxPadding: 6,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return ` ${label}: ₹${Number(value).toLocaleString('en-IN')} (${percentage}%)`;
                    }
                }
            }
        },
        layout: { 
            padding: { top: 10, bottom: 10, left: 10, right: 10 } 
        },
        cutout: '60%'
    };

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center px-4">
                <h6 className="mb-0 fw-bold d-flex align-items-center text-dark">
                    <CreditCard size={18} className="me-2 text-success"/>
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
            <Card.Body className="d-flex align-items-center justify-content-center p-4">
                <div style={{ height: '320px', width: '100%' }} className="d-flex justify-content-center align-items-center">
                    {hasDisplayData ? (
                        <Pie data={chartData} options={options} />
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-4">
                            <PieChart size={48} className="mb-3 opacity-25" />
                            <p className="small mb-0 fw-medium text-center">No payment data available</p>
                            <p className="x-small text-muted mt-1 text-center">Payment methods will appear here when transactions are made</p>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
};