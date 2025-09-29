import React, { useState } from 'react';
import { Upload, message, Card, Radio, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import api from '../utils/api';

const UploadStep = ({ onNext, importType: initialImportType = 'contact' }) => {
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState(initialImportType);

  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.xlsx,.xls,.csv',
    beforeUpload: (file) => {
      const name = file.name.toLowerCase();
      const byExt = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
      if (!byExt) {
        message.error(`${file.name} sadece .xlsx/.xls/.csv formatında bir dosya olmalıdır!`);
      }
      return byExt || Upload.LIST_IGNORE;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post(`/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        message.success('Dosya başarıyla yüklendi ve önizleme verisi alındı!');
        onSuccess();
        onNext({
          import_type: importType,
          job_id: response.data.job_id,
          preview_data: response.data
        });
      } catch (error) {
        const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
        message.error(`Dosya yüklenirken bir hata oluştu: ${msg}`);
        onError(error);
      } finally {
        setLoading(false);
      }
    },
  };

  return (
    <Card className="text-center">
      <h2 className="text-2xl font-semibold mb-4">Adım 1: Dosya Yükleme</h2>
      <div className="mb-6">
        <Space direction="vertical">
          <div className="text-left">
            <span className="font-semibold mr-3">Import Type:</span>
            <Radio.Group value={importType} onChange={(e) => setImportType(e.target.value)}>
              <Radio.Button value="contact">Contact</Radio.Button>
              <Radio.Button value="ticket">Ticket</Radio.Button>
              <Radio.Button value="organization">Organization</Radio.Button>
            </Radio.Group>
          </div>
          <p className="text-gray-600">
            İçeri aktarmak istediğiniz Excel (.xlsx, .xls) veya CSV (.csv) dosyasını sürükleyip bırakın veya seçin.
          </p>
        </Space>
      </div>
      <Upload.Dragger {...uploadProps} disabled={loading}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">Dosyayı buraya sürükleyin veya tıklayarak seçin</p>
        <p className="ant-upload-hint">
          Sadece Excel (.xlsx, .xls) veya CSV (.csv) dosyalarını destekler. Tek seferde bir dosya yükleyebilirsiniz.
        </p>
      </Upload.Dragger>
    </Card>
  );
};

export default UploadStep;