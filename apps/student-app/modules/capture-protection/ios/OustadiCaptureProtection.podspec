Pod::Spec.new do |s|
  s.name = 'OustadiCaptureProtection'
  s.version = '1.0.0'
  s.summary = 'Capture-state observation for the oustadi plus app'
  s.description = 'Pauses protected lesson playback during iOS recording and mirroring.'
  s.license = { :type => 'Proprietary', :text => 'Copyright Oustadi Plus. All rights reserved.' }
  s.author = 'Oustadi Plus'
  s.homepage = 'https://github.com/ouaalane/OstadiPlusPrototype'
  s.source = { :git => 'https://github.com/ouaalane/OstadiPlusPrototype.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
