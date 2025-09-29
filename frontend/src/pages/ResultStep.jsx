import React from 'react';
import { Card, Button, Typography, Space, Divider, Tag } from 'antd';
import { RollbackOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ResultStep = ({ onReset, transformResult }) => {
  if (!transformResult) {
    return (
      <Card className="text-center">
        <Title level={4}>Sonuç Verisi Yok</Title>
        <Text>Lütfen önce bir içe aktarma işlemi gerçekleştirin.</Text>
        <div className="mt-6">
          <Button onClick={onReset} icon={<RollbackOutlined />}>
            Yeni İşlem Başlat
          </Button>
        </div>
      </Card>
    );
  }

  const { success, errors, report, export_path } = transformResult || {};

  const getDownloadInfo = () => {
    if (!export_path) return null;
    try {
      const parts = String(export_path).split(/[\\/]/);
      const filename = parts[parts.length - 1];
      if (!filename || (!filename.endsWith('.json') && !filename.endsWith('.csv'))) return null;
      const url = `/exports/${filename}`;
      return { filename, url };
    } catch (e) {
      return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'green';
      case 'missing_required':
        return 'volcano';
      case 'invalid_email':
      case 'invalid_phone':
        return 'orange';
      case 'duplicate':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ok':
        return 'Başarılı';
      case 'missing_required':
        return 'Zorunlu Alan Eksik';
      case 'invalid_email':
        return 'Geçersiz E-posta Formatı';
      case 'invalid_phone':
        return 'Geçersiz Telefon Formatı';
      case 'duplicate':
        return 'Yinelenen Kayıt';
      default:
        return 'Bilinmeyen Hata';
    }
  };

  const totalProcessed = (report?.summary?.success || 0) + (report?.summary?.errors || 0);

  const downloadInfo = getDownloadInfo();

  return (
    <Card className="text-center">
      <Title level={4}>İçe Aktarma Tamamlandı!</Title>
      <div className="flex justify-around items-center my-6">
        <div className="text-center">
          <CheckCircleOutlined className="text-green-500 text-4xl mb-2" />
          <Title level={2}>{success}</Title>
          <Text>Başarılı Kayıt</Text>
        </div>
        <div className="text-center">
          <ExclamationCircleOutlined className="text-red-500 text-4xl mb-2" />
          <Title level={2}>{errors}</Title>
          <Text>Hatalı Kayıt</Text>
        </div>
      </div>

      <Text className="text-gray-600 mb-4">
        Toplam {totalProcessed} kayıttan {success} tanesi başarıyla içe aktarıldı.
      </Text>

      {report?.rows && report.rows.some(row => row.status !== 'ok') && (
        <>
          <Divider>Detaylı Rapor</Divider>
          <Card>
            <Title level={5}>Hatalı Satırlar</Title>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {report.rows.filter(row => row.status !== 'ok').map((row, index) => (
                <div key={index} className="flex flex-col p-4 border rounded-md">
                  <Text strong>Satır No: {row.row}</Text>
                  <Space size="small" className="mt-2">
                    <Text strong>Durum:</Text>
                    <Tag color={getStatusColor(row.status)}>{getStatusText(row.status)}</Tag>
                  </Space>
                  <Text className="mt-2">Hatalar: {row.errors.join(', ') || 'Yok'}</Text>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {downloadInfo && (
        <div className="flex justify-center mt-4">
          <Button type="default" href={downloadInfo.url} target="_blank" rel="noopener noreferrer">
            JSON'u İndir ({downloadInfo.filename})
          </Button>
        </div>
      )}

      <div className="flex justify-center mt-6">
        <Button type="primary" onClick={onReset} icon={<RollbackOutlined />}>
          Yeni İşlem Başlat
        </Button>
      </div>
    </Card>
  );
};

export default ResultStep;