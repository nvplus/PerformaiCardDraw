import React, { CSSProperties, ReactNode } from 'react';
import styles from './app.css';

interface ContainerProps {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}

const Container = ({ children, style }: ContainerProps) => {
  return (
    <div className={styles.container} style={style}>
      {children}
    </div>
  );
};

export default Container;
