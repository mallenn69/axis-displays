import { z } from 'zod';
export const roles = ['Pastor', 'Tech Director', 'Worship Leader', 'Other'] as const;
export const timelines = ['Before Christmas', 'Before Easter', 'This year', 'Just exploring'] as const;
export const quoteSchema = z.object({
 name: z.string().trim().min(1, 'Please enter your name.').max(100), church_name: z.string().trim().min(1, 'Please enter your organization name.').max(150),
 role: z.enum(roles, { errorMap: () => ({ message: 'Please select your role.' }) }), email: z.string().trim().email('Please enter a valid email.').max(255),
 phone: z.string().trim().max(40), city: z.string().trim().min(1, 'Please enter your city.').max(100), state: z.string().trim().min(2, 'Please enter your state.').max(100),
 stage_width: z.union([z.literal(''), z.coerce.number().min(1, 'Enter a width between 1 and 1,000 feet.').max(1000)]).transform(v => v === '' ? null : v),
 install_timeline: z.union([z.literal(''), z.enum(timelines)]), message: z.string().trim().max(3000, 'Please keep your message under 3,000 characters.'), website: z.string().max(0),
});
export const formFields = [
 { name: 'name', label: 'Name', required: true }, { name: 'church_name', label: 'Church / organization', required: true }, { name: 'role', label: 'Role', required: true, options: roles },
 { name: 'email', label: 'Email', required: true, type: 'email' }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'city', label: 'City', required: true }, { name: 'state', label: 'State', required: true },
 { name: 'stage_width', label: 'Approximate display width (ft)', type: 'number' }, { name: 'install_timeline', label: 'When do you want it installed?', options: timelines, wide: true }, { name: 'message', label: 'Tell us about your project', multiline: true, wide: true },
];
export const formCopy = { choose: 'Select an option', error: 'We couldn’t send your request. Please try again.', privacy: 'We’ll only use your details to respond to your request.', successTitle: 'Request received.', required: 'Required', spamLabel: 'Website' };
