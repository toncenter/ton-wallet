import React, { useCallback } from 'react';

interface ToggleButtonProps {
    value: boolean,
    onChange: Function,
}

function ToggleButton({value, onChange}: ToggleButtonProps) {

    const clickHandler = useCallback(() => {
        onChange(!value);
    }, [value, onChange])

    return (
        <div className={`dropdown-toggle ${value ? 'toggle-on' : ''}`} onClick={clickHandler}/>
    )
}

export default ToggleButton;
