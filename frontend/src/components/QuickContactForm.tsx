import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FormField } from './ui/FormField';

interface QuickContactFormProps {
  onClose: () => void;
}

const QuickContactForm: React.FC<QuickContactFormProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    setLoading(true);
    try {
      const response = await contactsAPI.create(formData);
      toast.success('Contact added successfully!');
      onClose();
      navigate(`/contacts/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="First Name"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <FormField
          label="Last Name"
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
      </div>

      <FormField
        label="Email"
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
      />

      <FormField
        label="Phone"
        id="phone"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
      />

      <FormField
        label="Company"
        id="company"
        name="company"
        value={formData.company}
        onChange={handleChange}
      />

      <FormField
        label="Position"
        id="position"
        name="position"
        value={formData.position}
        onChange={handleChange}
      />

      <div className="flex gap-mobile pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 btn-mobile bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Adding...' : 'Add Contact'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 btn-mobile bg-gray-200 text-primary rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default QuickContactForm;