import { useEffect, useState } from 'react';
import { useRive, useViewModelInstanceNumber, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-webgl2';
RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL}rive.wasm`);

/** mode: 0 = Idle, 1 = Thinking, 2 = Speaking. */
export default function Character({ mode = 0, onReady, onStateChange, onError }) {
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}guigu.riv`,
    artboard: 'Guigu', stateMachine: 'Character', autoplay: true, autoBind: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onStateChange: event => onStateChange?.(event.data),
    onLoadError: () => { setFailed(true); onError?.(); },
  });
  const instance = rive?.viewModelInstance;
  const { setValue } = useViewModelInstanceNumber('mode', instance);
  useEffect(() => {
    if (instance) { setValue(mode); onReady?.(); }
  }, [instance, mode, setValue, onReady]);
  return failed ? <p role="alert">角色加载失败，请刷新重试。</p> :
    <RiveComponent role="img" aria-label={`小龟，${['待机', '思考', '说话'][mode]}状态`} />;
}
