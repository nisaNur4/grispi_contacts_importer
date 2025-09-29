import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Input, Space, Select, Typography } from 'antd';
import api from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

const DEFAULT_PAGE_SIZE = 10;

function ContactsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts', {
        params: {
          q,
          sort,
          order,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          ...params,
        },
      });
      setData(data.items || []);
      setTotal(data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [q, sort, order, page, pageSize]);

  const columns = useMemo(() => [
    {
      title: 'Ad',
      dataIndex: 'first_name',
      key: 'first_name',
    },
    {
      title: 'Soyad',
      dataIndex: 'last_name',
      key: 'last_name',
    },
    {
      title: 'E-posta',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Şirket',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Unvan',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Not',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: 'Oluşturulma',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => (v ? new Date(v).toLocaleString() : ''),
    },
  ], []);

  return (
    <Card>
      <Title level={4}>Kişiler</Title>
      <Space className="mb-4" size="middle" wrap>
        <Input.Search
          placeholder="Ara (ad, soyad, e-posta, telefon, şirket)"
          allowClear
          onSearch={(value) => { setPage(1); setQ(value); }}
          enterButton
          style={{ minWidth: 360 }}
        />
        <Space>
          <Text strong>Sırala:</Text>
          <Select value={sort} onChange={(v) => { setPage(1); setSort(v); }} style={{ minWidth: 160 }}>
            <Option value="created_at">Oluşturulma</Option>
            <Option value="first_name">Ad</Option>
            <Option value="last_name">Soyad</Option>
            <Option value="email">E-posta</Option>
          </Select>
          <Select value={order} onChange={(v) => { setPage(1); setOrder(v); }} style={{ minWidth: 120 }}>
            <Option value="desc">Azalan</Option>
            <Option value="asc">Artan</Option>
          </Select>
        </Space>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `Toplam ${t} kayıt`,
        }}
      />
    </Card>
  );
}

export default ContactsPage;
