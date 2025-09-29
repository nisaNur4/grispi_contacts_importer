import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Typography, Select, message } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;
const PreviewStep = ({ onNext, onPrevious, jobId, previewData }) => {
  const [localPreview, setLocalPreview] = useState(previewData);

  useEffect(() => {
    setLocalPreview(previewData);
  }, [previewData]);

  if (!localPreview) {
    return (
      <Card className="text-center">
        <Title level={4}>Önizleme Verisi Yok</Title>
        <Text>Lütfen önce bir dosya yükleyin.</Text>
        <div className="mt-6">
          <Button onClick={onPrevious} icon={<LeftOutlined />}>
            Geri
          </Button>
        </div>
      </Card>
    );
  }

  const { sheet, sheets = [], columns, rows } = localPreview;

  const tableColumns = columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
  }));

  const dataSource = rows.map((row, index) => ({
    ...row,
    key: index,
  }));

  const handleNext = () => {
    onNext({ job_id: jobId, preview_data: { ...localPreview } });
  };

  const handleSheetChange = (selectedSheet) => {
    if (!jobId) return;
    api.get(`/preview/${jobId}`, { params: { sheet: selectedSheet } })
      .then(({ data }) => {
        setLocalPreview(data);
      })
      .catch((error) => {
        const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
        message.error(`Önizleme alınamadı: ${msg}`);
      });
  };

  return (
    <Card>
      <Title level={4}>Adım 2: Veri Önizleme</Title>
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex justify-between items-center">
          <Text strong>Dosyada bulunan sayfa: </Text>
          <Select
            value={sheet}
            onChange={handleSheetChange}
            style={{ minWidth: 200 }}
          >
            {sheets.map((s) => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>
        </div>
        <Table
          dataSource={dataSource}
          columns={tableColumns}
          pagination={false}
          scroll={{ x: 'max-content' }}
          bordered
          title={() => <Text strong>Önizleme Verileri (İlk {dataSource.length} Satır)</Text>}
        />
        <div className="flex justify-between mt-6">
          <Button onClick={onPrevious} icon={<LeftOutlined />}>
            Geri
          </Button>
          <Button type="primary" onClick={handleNext} icon={<RightOutlined />}>
            Devam Et
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default PreviewStep;