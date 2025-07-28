import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import axios from 'axios';

const ImportLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('http://localhost:8000/import-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Logları getirme hatası:', error);
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

  const getSuccessRate = (successful, total) => {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  const getStatusColor = (successful, failed) => {
    if (failed === 0) return 'text-green-600';
    if (successful === 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = (successful, failed) => {
    if (failed === 0) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (successful === 0) return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Loglar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Import Logları</h2>
            <span className="ml-2 text-sm text-gray-500">({logs.length} kayıt)</span>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Henüz import logu bulunmuyor
            </h3>
            <p className="text-gray-500">
              Excel dosyası yükleyerek import işlemi yapabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getStatusIcon(log.successful_records, log.failed_records)}
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {log.filename}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getStatusColor(log.successful_records, log.failed_records)}`}>
                      %{getSuccessRate(log.successful_records, log.total_records)} Başarı
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-blue-600 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-blue-800">Toplam</p>
                        <p className="text-lg font-bold text-blue-900">{log.total_records}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-green-800">Başarılı</p>
                        <p className="text-lg font-bold text-green-900">{log.successful_records}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-red-800">Başarısız</p>
                        <p className="text-lg font-bold text-red-900">{log.failed_records}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-600 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-gray-800">Durum</p>
                        <p className="text-sm font-medium text-gray-900">
                          {log.failed_records === 0 ? 'Tamamlandı' : 
                           log.successful_records === 0 ? 'Başarısız' : 'Kısmi Başarı'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {log.errors && log.errors.length > 0 && (
                  <div className="mt-4">
                    <details className="group">
                      <summary className="flex items-center cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                        Hataları Görüntüle ({log.errors.length} hata)
                      </summary>
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
                        <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                          {JSON.parse(log.errors).map((error, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-600 mr-2">•</span>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportLogs; 