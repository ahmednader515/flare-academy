"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/lib/contexts/language-context';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Define types for analytics data
interface CourseAnalytic {
  id: string;
  title: string;
  sales: number;
  revenue: number;
  completionRate: number;
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface AnalyticsData {
  totalRevenue: number;
  totalSales: number;
  courseCount: number;
  courseAnalytics: CourseAnalytic[];
  revenueData: ChartData;
  salesData: ChartData;
}

const AnalyticsPage = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalSales: 0,
    courseCount: 0,
    courseAnalytics: [],
    revenueData: {
      labels: [],
      datasets: [
        {
          label: t('dashboard.revenue'),
          data: [],
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    },
    salesData: {
      labels: [],
      datasets: [
        {
          label: t('dashboard.sales'),
          data: [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/teacher/analytics');
        setAnalytics(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Get text color based on theme
  const textColor = theme === 'dark' ? 'white' : '#334155'; // slate-700 for light mode

  // Get grid color based on theme
  const gridColor = theme === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(100, 116, 139, 0.2)'; // slate-400 with opacity for light mode

  // Update chart options to be theme-compatible
  const barOptions = {
    responsive: true,
    color: textColor,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      title: {
        display: true,
        text: t('dashboard.revenueByCourse'),
        color: textColor,
        font: {
          family: 'Inter, sans-serif',
          size: 16,
          weight: 'bold' as const
        }
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor
        },
        grid: {
          color: gridColor
        }
      },
      y: {
        ticks: {
          color: textColor
        },
        grid: {
          color: gridColor
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    color: textColor,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      title: {
        display: true,
        text: t('dashboard.salesDistribution'),
        color: textColor,
        font: {
          family: 'Inter, sans-serif',
          size: 16,
          weight: 'bold' as const
        }
      },
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard.analyticsDashboard')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.yourAnalytics')}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-orange-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.totalRevenue')}</h3>
          <p className="text-3xl font-bold">EGP {analytics.totalRevenue.toFixed(2)}</p>
        </Card>
        <Card className="p-6 bg-green-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.totalSales')}</h3>
          <p className="text-3xl font-bold">{analytics.totalSales}</p>
        </Card>
        <Card className="p-6 bg-amber-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.publishedCourses')}</h3>
          <p className="text-3xl font-bold">{analytics.courseCount}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">{t('dashboard.revenueByCourse')}</h3>
          <div className="h-80">
            <Bar options={barOptions} data={analytics.revenueData} />
          </div>
        </Card>
        <Card className="p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">{t('dashboard.salesDistribution')}</h3>
          <div className="h-80 flex items-center justify-center">
            <Pie options={pieOptions} data={analytics.salesData} />
          </div>
        </Card>
      </div>

      {/* Course Performance Table */}
      <Card className="p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">{t('dashboard.coursePerformance')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">{t('dashboard.course')}</th>
                <th className="text-center py-3 px-2">{t('dashboard.sales')}</th>
                <th className="text-center py-3 px-2">{t('dashboard.revenue')}</th>
                <th className="text-center py-3 px-2">{t('dashboard.completionRate')}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.courseAnalytics.map((course) => (
                <tr key={course.id} className="border-b hover:bg-slate-50 transition">
                  <td className="py-3 px-2">{course.title}</td>
                  <td className="text-center py-3 px-2">{course.sales}</td>
                  <td className="text-center py-3 px-2">EGP {course.revenue.toFixed(2)}</td>
                  <td className="text-center py-3 px-2">
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2 max-w-[150px]">
                        <div
                          className="bg-[#FF6B35] h-2.5 rounded-full"
                          style={{ width: `${course.completionRate}%` }}
                        ></div>
                      </div>
                      <span>{course.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage; 