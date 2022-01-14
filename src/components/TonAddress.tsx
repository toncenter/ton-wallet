import { MouseEventHandler } from 'react';

interface TonAddressProps {
    address: string;
    className?: string;
    id?: string;
    onSelect?: MouseEventHandler;
}

function TonAddress({address, id, className, onSelect}: TonAddressProps) {
    return (
        <div id={id} className={`addr ${className}`} onClick={onSelect}>
            {address.substring(0, address.length / 2)}
            <wbr/>
            {address.substring(address.length / 2)}
        </div>
    )
}

export default TonAddress;
