import React, { useState, useEffect } from 'react';
import { Settings, Copy, Calendar } from 'lucide-react';
import axios from 'axios';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('http://localhost:8000/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Şablonları getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldLabel = (key) => {
    const fieldLabels = {
      'first_name': 'Ad',
      'last_name': 'Soyad',
      'email': 'E-posta',
      'phone': 'Telefon',
      'company': 'Şirket',
      'position': 'Pozisyon',
      'address': 'Adres',
      'notes': 'Notlar'
    };
    return fieldLabels[key] || key;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Şablonlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Import Şablonları</h2>
            <span className="ml-2 text-sm text-gray-500">({templates.length} şablon)</span>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Henüz şablon bulunmuyor
            </h3>
            <p className="text-gray-500">
              Dosya yükleme sırasında şablon kaydederek burada görüntüleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(template.created_at)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Sütun Eşleştirmeleri:</h4>
                  <div className="space-y-2">
                    {Object.entries(template.mappings).map(([grispiField, excelColumn]) => (
                      <div key={grispiField} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">
                          {getFieldLabel(grispiField)}:
                        </span>
                        <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {excelColumn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {Object.keys(template.mappings).length} alan eşleştirilmiş
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(template.mappings, null, 2));
                          alert('Şablon kopyalandı!');
                        }}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Kopyala
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates; 