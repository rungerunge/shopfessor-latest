import styles from "./knob.module.css";

type KnobProps = {
  ariaLabel: string;
  selected: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

export const Knob = ({ ariaLabel, selected, onClick }: KnobProps) => {
  return (
    <button
      id=":rgi:"
      className={`${styles.track} ${selected && styles.track_on}`}
      aria-label={ariaLabel}
      role="switch"
      type="button"
      aria-checked="false"
      onClick={onClick}
    >
      <div className={`${styles.knob} ${selected && styles.knob_on}`}></div>
    </button>
  );
};
