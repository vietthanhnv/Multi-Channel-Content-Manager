import React, { useState, useEffect } from 'react';
import { UserSettingsModal } from './UserSettingsModal';
import { useUserSettings } from '../hooks/useUserSettings';
import { UserSettingsIntegrationService } from '../services/userSettingsIntegration';

export const UserSettingsDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { 
    userSettings, 
    updateUserSettings, 
    getWorkingHoursPerDay, 
    getMaxDailyCapacity 
  } = useUserSettings();

  const resetToDefaults = () => {
    updateUserSettings({
      weeklyCapacityHours: 40,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: { start: '09:00', end: '17:00' }
    });
  };

  const updateCurrentSettings = () => {
    const settingsContainer = document.getElementById('currentSettings');
    const calculationsContainer = document.getElementById('calculationResults');
    
    if (settingsContainer) {
      settingsContainer.innerHTML = `
        <div class="setting-item">
          <div class="setting-label">Weekly Capacity</div>
          <div class="setting-value">${userSettings.weeklyCapacityHours} hours</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Working Days</div>
          <div class="setting-value">${userSettings.workingDays.join(', ')}</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Working Hours</div>
          <div class="setting-value">${userSettings.workingHours.start} - ${userSettings.workingHours.end}</div>
        </div>
      `;
    }

    if (calculationsContainer) {
      const hoursPerDay = getWorkingHoursPerDay();
      const maxDailyCapacity = getMaxDailyCapacity();
      const summary = UserSettingsIntegrationService.getUserSettingsSummary(userSettings);
      const defaultTime = UserSettingsIntegrationService.getDefaultPostingTime(userSettings);
      const nextWorkingDay = UserSettingsIntegrationService.getNextWorkingDay(userSettings);
      
      calculationsContainer.innerHTML = `
        <div class="setting-item">
          <div class="setting-label">Hours Per Working Day</div>
          <div class="setting-value">${hoursPerDay.toFixed(1)} hours</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Max Daily Capacity</div>
          <div class="setting-value">${maxDailyCapacity.toFixed(1)} hours</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Default Posting Time</div>
          <div class="setting-value">${defaultTime}</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Next Working Day</div>
          <div class="setting-value">${nextWorkingDay.toLocaleDateString()}</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Settings Summary</div>
          <div class="setting-value">${summary.workingDaysText}</div>
        </div>
        <div class="setting-item">
          <div class="setting-label">Daily Capacity</div>
          <div class="setting-value">${summary.dailyCapacityText}</div>
        </div>
      `;
    }
  };

  useEffect(() => {
    updateCurrentSettings();
  }, [userSettings, getWorkingHoursPerDay, getMaxDailyCapacity]);

  useEffect(() => {
    const openBtn = document.getElementById('openSettingsBtn');
    const resetBtn = document.getElementById('resetToDefaultsBtn');

    const handleOpenSettings = () => setIsModalOpen(true);
    const handleReset = () => resetToDefaults();

    if (openBtn) openBtn.addEventListener('click', handleOpenSettings);
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    return () => {
      if (openBtn) openBtn.removeEventListener('click', handleOpenSettings);
      if (resetBtn) resetBtn.removeEventListener('click', handleReset);
    };
  }, []);

  return (
    <UserSettingsModal 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
    />
  );
};