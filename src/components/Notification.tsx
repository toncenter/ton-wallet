import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { selectNotification, setNotification } from 'store/app/appSlice';

function Notification() {
    const dispatch = useAppDispatch();
    const notification = useAppSelector(selectNotification);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (notification) {
            timeout = setTimeout(() => {
                dispatch(setNotification(''));
            }, 2000);
        }
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [dispatch, notification]);

    return notification ? <div id="notify">{notification}</div> : <></>;
}

export default Notification;
