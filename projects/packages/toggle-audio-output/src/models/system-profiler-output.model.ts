export interface SystemProfilerOutput {
  SPAudioDataType: SPAudioDataType[];
}

export interface SPAudioDataType {
  _items: Item[];
  _name: string;
}

export interface Item {
  _name: string;
  coreaudio_device_manufacturer: string;
  coreaudio_device_output?: number;
  coreaudio_device_srate: number;
  coreaudio_device_transport: string;
  coreaudio_output_source?: string;
  coreaudio_device_input?: number;
  coreaudio_input_source?: string;
  coreaudio_default_audio_input_device?: string;
  _properties?: string;
  coreaudio_default_audio_output_device?: string;
  coreaudio_default_audio_system_device?: string;
}
