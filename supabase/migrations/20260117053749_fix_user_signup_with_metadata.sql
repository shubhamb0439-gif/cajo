/*
  # Fix User Signup to Use Metadata

  ## Changes
  
  1. **Update handle_new_user function**
     - Read both name and role from user metadata
     - Allow admins to set custom roles during signup via metadata
  
  ## How It Works
  - When signUp is called with options.data containing name and role,
    the trigger will use those values instead of defaults
  - If no metadata is provided, defaults to 'User' name and 'user' role
*/

-- Update the function to read role from metadata as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
