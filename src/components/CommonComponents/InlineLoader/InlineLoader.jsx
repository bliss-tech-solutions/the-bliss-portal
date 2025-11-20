import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import './InlineLoader.css';

const InlineLoader = ({
    text = 'Loading…',
    color = 'var(--brand-color)',
    size = 18,
    className = ''
}) => {
    const indicator = (
        <LoadingOutlined
            style={{
                fontSize: size,
                color
            }}
            spin
        />
    );

    return (
        <div className={`inline-loader ${className}`}>
            <Spin indicator={indicator} />
            {text && <span className="inline-loader-text">{text}</span>}
        </div>
    );
};

export default InlineLoader;

