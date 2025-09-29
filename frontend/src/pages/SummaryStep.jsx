import React, { useState } from 'react';
import { Card, Button, Space, Typography, Radio, message, Divider } from 'antd';
import { LeftOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

const SummaryStep = ({ onNext, onPrevious, jobId, excelColumns, mapping, sheetName, importType = 'contact' }) => {
  const [saveMode, setSaveMode] = useState('sqlite');
  const [loading, setLoading] = useState(false);

  const finalMapping = Object.fromEntries(
    Object.entries(mapping || {}).filter(([key, value]) => value !== 'do_not_import' && value !== null)
  );

  const mappedCount = Object.keys(finalMapping).length;
  const unmappedCount = (excelColumns || []).length - mappedCount;

  const onSave = async () => {
    setLoading(true);
    try {
      let mappingToUse = finalMapping;
      if (Object.keys(mappingToUse).length === 0) {
        const { data } = await api.post(`/suggest-mapping`, excelColumns);
        mappingToUse = data.mapping || {};
        if (Object.keys(mappingToUse).length === 0) {
          message.error('Otomatik eşleştirme yapılamadı. Lütfen en az bir alanı eşleştirin.');
          setLoading(false);
          return;
        }
      }

      const response = await api.post(`/transform/${jobId}`, {
        mapping: mappingToUse,
        sheet: sheetName,
        save_mode: saveMode,
        import_type: importType,
      });

      message.success('Veriler başarıyla kaydedildi!');
      onNext({ transform_result: response.data });
    } catch (error) {
      const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
      message.error(`İşlem sırasında bir hata oluştu: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4}>Adım 4: Özeti Onayla ve Kaydet</Title>
      <Space direction="vertical" size="large" className="w-full">
        <div className="p-4 bg-gray-50 rounded-lg">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <Text strong>Eşleştirilen Alan Sayısı:</Text> {mappedCount}
            </li>
            <li>
              <Text strong>Eşleştirilmeyen Alan Sayısı:</Text> {unmappedCount}
            </li>
            <li>
              <Text strong>Excel Sayfası:</Text> {sheetName}
            </li>
          </ul>
        </div>

        <Divider orientation="left">Kaydetme Seçenekleri</Divider>

        <div className="bg-gray-100 p-6 rounded-lg">
          <Radio.Group
            onChange={(e) => setSaveMode(e.target.value)}
            value={saveMode}
            className="mt-4"
          >
            <Space direction="vertical">
              <Radio value="sqlite">
                SQLite Veritabanına Kaydet (<Text type="secondary">Kişiler veritabanına eklenecektir.</Text>)
              </Radio>
              <Radio value="json">
                JSON Dosyası Olarak Dışa Aktar (<Text type="secondary">İndirme bağlantısı sonuç ekranında görünecek.</Text>)
              </Radio>
              <Radio value="csv">
                CSV Dosyası Olarak Dışa Aktar (<Text type="secondary">İndirme bağlantısı sonuç ekranında görünecek.</Text>)
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        <div className="flex justify-between mt-6">
          <Button onClick={onPrevious} icon={<LeftOutlined />}>
            Geri
          </Button>
          <Button type="primary" onClick={onSave} loading={loading} icon={<CheckOutlined />}>
            Kaydet ve Bitir
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default SummaryStep;