import { useCallback, useMemo, useRef, useState } from 'react';

import { IMPORT_WORDS_COUNT, MNEMONIC_WORD_LIST } from 'constants/app';

interface MnemonicWordInputProps {
    index: number;
    value: string;
    submitted: boolean;
    onChange: Function;
}

function MnemonicWordInput({index, value, submitted, onChange}: MnemonicWordInputProps) {
    const inputRef = useRef<any>();
    const dropDownRef = useRef<any>();
    const [active, setActive] = useState(false);
    const [showDropDown, setShowDropDown] = useState(false);
    const [selectedWord, setSelectedIndex] = useState(-1);

    const visibleMnemonicWords = useMemo(() => {
        return MNEMONIC_WORD_LIST.filter((word: string) => word.indexOf(value) === 0)
    }, [value]);

    const hasErrors = useMemo(() => {
        return (!active || (submitted && !active)) && (value || submitted) && MNEMONIC_WORD_LIST.indexOf(value) === -1
    }, [active, value, submitted])

    const showWordsPopup = useCallback((input) => {
        const text = input.value;
        if (text === null || text.length === 0) {
            return setShowDropDown(false);
        }
        setShowDropDown(true);
    }, []);

    const focusHandler = useCallback((event) => {
        showWordsPopup(event.target);
        setActive(true);
    }, [showWordsPopup]);

    const blurHandler = useCallback(() => {
        setShowDropDown(false);
        setActive(false);
    }, []);

    const keyDownHandler = useCallback((event) => {
        switch (event.key) {
            case 'Enter':
                if (!value) {
                    return;
                }
                if (value && visibleMnemonicWords[selectedWord]) {
                    onChange(visibleMnemonicWords[selectedWord]);
                    setShowDropDown(false);
                }
                const focusableElements = Array.from(document.querySelectorAll('input')).sort(function(a, b) {
                    return a.tabIndex - b.tabIndex;
                });
                const index = Array.prototype.indexOf.call(focusableElements, document.activeElement)
                if(event.shiftKey && (index - 1) >= 0) {
                    return focusableElements[index - 1].focus();
                }
                if (!event.shiftKey && (index + 1) < IMPORT_WORDS_COUNT) {
                    focusableElements[index + 1].focus();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (dropDownRef.current && (selectedWord - 1) >= 0) {
                    setSelectedIndex(selectedWord - 1);
                    dropDownRef.current.scrollTo(0, 30 * (selectedWord - 1));
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (dropDownRef.current && (selectedWord + 1) < visibleMnemonicWords.length) {
                    setSelectedIndex(selectedWord + 1);
                    dropDownRef.current.scrollTo(0, 30 * (selectedWord + 1));
                }
                break;
        }
    }, [value, visibleMnemonicWords, selectedWord, onChange]);

    const inputHandler = useCallback((event) => {
        if (dropDownRef.current) {
            dropDownRef.current.scrollTo(0, 0);
        }
        setSelectedIndex(0);
        showWordsPopup(event.target);
        onChange(event.target.value);
    }, [onChange, showWordsPopup]);

    const pasteHandler = useCallback((event) => {
        const values = [];
        const text = (event.clipboardData || (window as any).clipboardData).getData('text');
        let arr = text.split(' ');
        if (arr.length !== IMPORT_WORDS_COUNT) {
            arr = text.split(',');
        }
        if (arr.length === IMPORT_WORDS_COUNT) {
            for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
                const value = arr[i].toLowerCase().trim();
                values.push(value);
            }
            onChange(values);
            event.preventDefault();
            return;
        }
        inputHandler(event);
    }, [inputHandler, onChange]);

    const selectHandler = useCallback((value) => {
        onChange(value);
        setShowDropDown(false);
        setSelectedIndex(0);
    }, [onChange])

    return (
        <>
            <input ref={inputRef}
                   id={'importInput' + index}
                   type="text"
                   value={value}
                   tabIndex={index + 1}
                   autoComplete="off"
                   className={`${hasErrors ? 'error' : ''}`}
                   onFocus={focusHandler}
                   onBlur={blurHandler}
                   onKeyDown={keyDownHandler}
                   onPaste={pasteHandler}
                   onChange={inputHandler}
                   onInput={inputHandler}
                   onCut={inputHandler}
            />
            {
                showDropDown && !!visibleMnemonicWords.length
                && <div ref={dropDownRef}
                        id="wordsPopup"
                        style={{
                            'left': `${inputRef.current?.offsetLeft}px`,
                            'top': `${(inputRef.current?.offsetTop + inputRef.current?.offsetHeight)}px`
                        }}>
                    {
                        visibleMnemonicWords.map((word: string) => {
                            const isSelected = word === visibleMnemonicWords[selectedWord];
                            return (
                                <div key={word}
                                     className={`words-popup-item ${isSelected ? 'selected' : ''}`}
                                     onMouseDown={selectHandler.bind(null, word)}
                                >
                                    {word}
                                </div>
                            )
                        })
                    }
              </div>
            }
        </>
    )
}

export default MnemonicWordInput;
