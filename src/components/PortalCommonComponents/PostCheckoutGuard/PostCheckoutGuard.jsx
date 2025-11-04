import React from 'react';
import { Modal } from 'antd';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCheckoutStatusQuery } from '../../../store/api';

const PostCheckoutGuard = () => {
    const userId = useSelector((state) => state.auth?.userId || state.auth?.user?._id || state.auth?.user?.id);
    const location = useLocation();
    const navigate = useNavigate();

    const { data, isFetching, error } = useCheckoutStatusQuery({ userId }, { skip: !userId });

    const checkedOutToday = Boolean(data?.checkedOut);

    if (!userId || isFetching) return null;
    // If backend route doesn't exist (404), silently allow access
    if (error && (error.status === 404 || error.originalStatus === 404)) return null;
    if (location.pathname === '/') return null;

    if (checkedOutToday) {
        Modal.warning({
            title: 'You have already checked out today',
            content: 'Access to the portal is restricted after check-out. Please contact the administrator if you need assistance.',
            okText: 'Go to Login',
            centered: true,
            onOk: () => navigate('/')
        });
    }

    return null;
};

export default PostCheckoutGuard;


