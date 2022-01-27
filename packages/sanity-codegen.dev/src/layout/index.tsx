import { useRef, useState, useEffect } from 'react';
import classNames from 'classnames';
import styles from './styles.module.css';

type Props =
  | {
      className?: string;
    } & (
      | {
          left: React.ReactNode;
          right: React.ReactNode;
        }
      | {
          top: React.ReactNode;
          bottom: React.ReactNode;
        }
    );

interface P {
  children: (props: {}) => React.ReactNode;
}

export function Layout2() {}

export function Layout({ className, ...props }: Props) {
  const [size, setSize] = useState('50%');
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const horizontal = 'left' in props;
  const first = 'left' in props ? props.left : props.top;
  const last = 'right' in props ? props.right : props.bottom;

  useEffect(() => {
    if (!active) return;

    const handleMouseMove = (e: MouseEvent) => {
      const boundingBox = ref.current?.getBoundingClientRect();
      if (!boundingBox) return;

      const clientPosition = horizontal ? e.clientX : e.clientY;
      const offset = horizontal ? boundingBox.left : boundingBox.top;
      const boxSize = horizontal ? boundingBox.width : boundingBox.height;

      setSize(`${(((clientPosition - offset) / boxSize) * 100).toFixed(2)}%`);
    };

    const handleMouseUp = () => {
      setActive(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [active]);

  return (
    <div
      className={classNames(styles.layout, className)}
      ref={ref}
      style={{ flexDirection: horizontal ? 'row' : 'column' }}
    >
      <div
        className={styles.column}
        style={horizontal ? { width: size } : { height: size }}
      >
        {first}
      </div>

      <div
        className={styles.divider}
        onMouseDown={() => setActive(true)}
        style={
          horizontal
            ? { cursor: 'col-resize', width: 2, height: '100%' }
            : { cursor: 'row-resize', height: 2, width: '100%' }
        }
      />

      <div
        className={styles.column}
        style={
          horizontal
            ? { width: `calc(100% - ${size})` }
            : { height: `calc(100% - ${size})` }
        }
      >
        {last}
      </div>
    </div>
  );
}
