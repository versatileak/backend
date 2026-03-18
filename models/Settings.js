import { useEffect, useState } from 'react';
import { adminAPI } from '@/utils/api';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [formData, setFormData] = useState({
    monthly_price: '',
    quarterly_price: '',
    yearly_price: '',
    yearly_discount: '',
    quarterly_discount: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
      const data = res.data.settings;

      setFormData({
        monthly_price: data?.pricing?.monthly?.amount || '',
        quarterly_price: data?.pricing?.quarterly?.amount || '',
        yearly_price: data?.pricing?.yearly?.amount || '',
        yearly_discount: data?.pricing?.yearly?.discount_percentage || '',
        quarterly_discount: data?.pricing?.quarterly?.discount_percentage || ''
      });

    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      await adminAPI.updateSettings({
        pricing: {
          monthly: {
            amount: Number(formData.monthly_price),
            currency: 'INR',
            description: 'Monthly Premium Access'
          },
          quarterly: {
            amount: Number(formData.quarterly_price),
            currency: 'INR',
            description: 'Quarterly Premium Access',
            discount_percentage: Number(formData.quarterly_discount)
          },
          yearly: {
            amount: Number(formData.yearly_price),
            currency: 'INR',
            description: 'Yearly Premium Access',
            discount_percentage: Number(formData.yearly_discount)
          }
        }
      });

      toast.success('Settings updated successfully');

    } catch {
      toast.error('Failed to update settings');
    }
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto">

      <h1 className="text-2xl text-white mb-6">Pricing Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6">

        {/* Monthly */}
        <div>
          <label className="text-white block mb-2">Monthly Price (₹)</label>
          <input
            type="number"
            name="monthly_price"
            value={formData.monthly_price}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        {/* Quarterly */}
        <div>
          <label className="text-white block mb-2">Quarterly Price (₹)</label>
          <input
            type="number"
            name="quarterly_price"
            value={formData.quarterly_price}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-white block mb-2">Quarterly Discount (%)</label>
          <input
            type="number"
            name="quarterly_discount"
            value={formData.quarterly_discount}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        {/* Yearly */}
        <div>
          <label className="text-white block mb-2">Yearly Price (₹)</label>
          <input
            type="number"
            name="yearly_price"
            value={formData.yearly_price}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-white block mb-2">Yearly Discount (%)</label>
          <input
            type="number"
            name="yearly_discount"
            value={formData.yearly_discount}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <button className="btn-primary w-full">
          Save Settings
        </button>

      </form>
    </div>
  );
};

export default AdminSettings;